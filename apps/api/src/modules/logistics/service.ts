import crypto from "node:crypto";
import { Order } from "../../models/Order.js";
import { notify } from "../notifications/service.js";
import { notFound, badRequest } from "../../lib/http.js";

// Provider abstraction. The stub simulates AWB assignment + tracking so the flow works
// without credentials. Plug a real provider (e.g. Shiprocket) behind this interface using
// SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD; the routes/notifications don't change.
export interface ShipmentResult { provider: string; awb: string; courier: string; trackingUrl: string; }

export async function createShipment(_order: any): Promise<ShipmentResult> {
  const awb = "AWB" + crypto.randomBytes(5).toString("hex").toUpperCase();
  return { provider: "Shiprocket (stub)", awb, courier: "Lumina Express", trackingUrl: `https://track.alinaglumina.com/${awb}` };
}

// Assign a shipment to an order, mark it shipped, and notify the customer.
export async function shipOrder(orderId: string) {
  const order = await Order.findById(orderId);
  if (!order) throw notFound("Order not found");
  if (order.payment!.status !== "paid") throw badRequest("Only paid orders can be shipped");
  const s = await createShipment(order);
  order.shipment = { provider: s.provider, awb: s.awb, trackingUrl: s.trackingUrl, status: "shipped",
    events: [...(order.shipment?.events ?? []), { status: "shipped", note: `Handed to ${s.courier}`, at: new Date() }] } as any;
  order.status = "shipped";
  await order.save();
  if (order.user) await notify({ user: String(order.user), channels: ["inapp", "email"], type: "shipment", title: "Your order has shipped",
    body: `Order ${order.orderNo} is on its way. Track: ${s.trackingUrl}`, emailTemplate: "shippingUpdate", emailData: { orderNo: order.orderNo, trackingUrl: s.trackingUrl }, data: { orderId } });
  return order;
}

// Public/owner tracking view.
export async function track(orderId: string) {
  const order = await Order.findById(orderId).select("orderNo shipment status").lean();
  if (!order) throw notFound("Order not found");
  return { orderNo: order.orderNo, status: order.status, shipment: order.shipment ?? { status: "not_shipped", events: [] } };
}

// Provider webhook → advance status + notify on delivery.
export async function applyTrackingUpdate(awb: string, status: string, note?: string) {
  const order = await Order.findOne({ "shipment.awb": awb });
  if (!order) return null;
  order.shipment!.status = status as any;
  order.shipment!.events = [...(order.shipment!.events ?? []), { status, note, at: new Date() }] as any;
  if (status === "delivered") order.status = "delivered";
  await order.save();
  if (order.user) await notify({ user: String(order.user), channels: ["inapp", ...(status === "delivered" ? ["email" as const] : [])],
    type: "shipment", title: `Shipment ${status.replace(/_/g, " ")}`, body: `Order ${order.orderNo}: ${status.replace(/_/g, " ")}`,
    emailTemplate: status === "delivered" ? "deliveryConfirmation" : undefined, emailData: { orderNo: order.orderNo }, data: { orderId: order._id } });
  return order;
}
