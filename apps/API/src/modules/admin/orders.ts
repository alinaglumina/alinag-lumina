import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { Order } from "../../models/Order.js";
import { User } from "../../models/User.js";
import { Notification } from "../../models/Notification.js";
import { enqueueEmail } from "../jobs/index.js";
import { audit } from "../../utils/audit.js";
import { shipOrder } from "../logistics/service.js";

const r = Router();

// LIST — filter by fulfilment status, payment status, customer/orderNo search, date range.
r.get("/", validate(z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  from: z.string().optional(), to: z.string().optional(),
  page: z.coerce.number().default(1), limit: z.coerce.number().default(20),
  sort: z.string().default("-createdAt"),
}), "query"), asyncHandler(async (req, res) => {
  const { q, status, paymentStatus, from, to, page, limit, sort } = req.query as any;
  const filter: any = {};
  if (status) filter.status = status;
  if (paymentStatus) filter["payment.status"] = paymentStatus;
  if (q) filter.orderNo = new RegExp(q, "i");
  if (from || to) filter.createdAt = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to) }) };
  const [items, total, revenueAgg] = await Promise.all([
    Order.find(filter).populate("user", "name email").sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $match: { ...filter, "payment.status": "paid" } }, { $group: { _id: null, total: { $sum: "$amounts.total" } } }]),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit), paidRevenue: revenueAgg[0]?.total ?? 0 });
}));

// GET one — full detail with customer + items.
r.get("/:id", asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email phone").lean();
  if (!order) throw notFound("Order not found");
  res.json({ order });
}));

// UPDATE fulfilment status (created→confirmed→packed→shipped→delivered / cancelled / returned).
r.patch("/:id/status", validate(z.object({
  status: z.enum(["created", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"]),
})), asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound("Order not found");
  const before = order.status;
  order.status = req.body.status;
  await order.save();
  await audit(req, "order.status", "Order", req.params.id, { status: before }, { status: order.status });
  res.json({ order });
}));

// UPDATE shipment / tracking — push a timeline event and optionally notify the customer.
r.patch("/:id/shipment", validate(z.object({
  provider: z.string().optional(),
  awb: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  status: z.enum(["not_shipped", "processing", "shipped", "out_for_delivery", "delivered", "rto"]),
  note: z.string().optional(),
  notify: z.boolean().default(true),
})), asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound("Order not found");
  const s: any = order.shipment ?? {};
  if (req.body.provider) s.provider = req.body.provider;
  if (req.body.awb) s.awb = req.body.awb;
  if (req.body.trackingUrl) s.trackingUrl = req.body.trackingUrl;
  s.status = req.body.status;
  s.events = [...(s.events ?? []), { status: req.body.status, note: req.body.note, at: new Date() }];
  order.shipment = s;
  // keep the top-level order status roughly in sync
  if (req.body.status === "shipped") order.status = "shipped";
  if (req.body.status === "delivered") order.status = "delivered";
  await order.save();

  if (req.body.notify && order.user) {
    const user = await User.findById(order.user);
    await Notification.create({ user: order.user, audience: "user", channel: "inapp", type: "shipment_update",
      title: "Shipment update", body: `Order ${order.orderNo}: ${req.body.status.replace(/_/g, " ")}`, data: { orderId: order._id } });
    if (user?.email) {
      const tpl = req.body.status === "delivered" ? "deliveryConfirmation" : "shippingUpdate";
      await enqueueEmail(user.email, tpl as any, { orderNo: order.orderNo, trackingUrl: s.trackingUrl });
    }
  }
  await audit(req, "order.shipment", "Order", req.params.id, undefined, { status: req.body.status, awb: s.awb });
  res.json({ order });
}));

// Assign a shipment via the logistics provider (marks shipped + notifies the customer).
r.post("/:id/ship", asyncHandler(async (req, res) => {
  const order = await shipOrder(req.params.id);
  await audit(req, "order.ship", "Order", req.params.id, undefined, { awb: order.shipment?.awb });
  res.json({ order });
}));

export const adminOrderRoutes = r;
