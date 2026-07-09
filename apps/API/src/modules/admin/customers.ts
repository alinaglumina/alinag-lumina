import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { User } from "../../models/User.js";
import { Order } from "../../models/Order.js";
import { audit } from "../../utils/audit.js";

const r = Router();

// LIST customers — search + status filter + paginate.
r.get("/", validate(z.object({
  q: z.string().optional(), status: z.string().optional(),
  page: z.coerce.number().default(1), limit: z.coerce.number().default(20),
}), "query"), asyncHandler(async (req, res) => {
  const { q, status, page, limit } = req.query as any;
  const filter: any = { role: "customer" };
  if (status) filter.status = status;
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }, { phone: new RegExp(q, "i") }];
  const [items, total] = await Promise.all([
    User.find(filter).select("name email phone status emailVerified createdAt").sort("-createdAt").skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

// Detail — profile + lifetime spend + order count.
r.get("/:id", asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-passwordHash -otp -resetTokenHash -verifyTokenHash -twoFactor.secret").lean();
  if (!user) throw notFound("Customer not found");
  const [agg] = await Order.aggregate([
    { $match: { user: user._id, "payment.status": "paid" } },
    { $group: { _id: null, spent: { $sum: "$amounts.total" }, orders: { $sum: 1 } } },
  ]);
  res.json({ customer: user, stats: { spent: agg?.spent ?? 0, orders: agg?.orders ?? 0 } });
}));

// Suspend / reactivate.
r.patch("/:id/status", validate(z.object({ status: z.enum(["active", "suspended"]) })), asyncHandler(async (req, res) => {
  const before = await User.findById(req.params.id).select("status").lean();
  if (!before) throw notFound("Customer not found");
  const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).select("name email status");
  await audit(req, "customer.status", "User", req.params.id, { status: before.status }, { status: req.body.status });
  res.json({ customer: user });
}));

export const adminCustomerRoutes = r;
