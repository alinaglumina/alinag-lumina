import { Order } from "../../models/Order.js";
import { Product } from "../../models/Product.js";
import { Notification } from "../../models/Notification.js";
import { User } from "../../models/User.js";
import { enqueueEmail } from "../jobs/index.js";
import { logger } from "../../lib/logger.js";
import { notFound } from "../../lib/http.js";
import { recordRedemption } from "../coupons/service.js";

export type PayStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";

// Attach the Razorpay order id to our Order right after creating it.
export async function attachProviderOrder(orderId: string, providerOrderId: string) {
  await Order.updateOne({ _id: orderId }, { "payment.providerOrderId": providerOrderId, "payment.gateway": "Razorpay" });
}
export const getByProviderOrder = (providerOrderId: string) => Order.findOne({ "payment.providerOrderId": providerOrderId });

// Idempotent settle — safe to call from BOTH the browser verify AND the webhook.
// Whichever lands first wins; the second is a no-op. On "paid" we run fulfilment once.
export async function settle(orderId: string, status: PayStatus, reason?: string, paymentId?: string) {
  const order = await Order.findById(orderId);
  if (!order) throw notFound("Order not found");
  if (paymentId) order.payment!.providerPaymentId = paymentId;
  if (order.payment!.status === status) { await order.save(); return order; } // already applied
  if (order.payment!.status !== "pending") { await order.save(); return order; } // terminal already

  order.payment!.status = status;
  if (status === "paid") {
    order.status = "confirmed";
    await reduceInventory(order);
    order.invoiceUrl = await generateInvoice(order);
    if (order.coupon?.code) await recordRedemption(order.coupon.code);   // count usage only when paid
    await notifyPaid(order);
  } else if (status === "failed") {
    order.status = "created"; order.payment!.transactionId = reason ?? "failed";
  } else if (status === "cancelled") {
    order.status = "cancelled";
  }
  await order.save();
  return order;
}

async function reduceInventory(order: any) {
  for (const it of order.items) {
    if (it.product) await Product.updateOne({ _id: it.product }, { $inc: { stock: -Math.abs(it.qty || 1) } });
  }
}

// Invoice generation stub — returns a URL. Swap for a real PDF (see pdf skill) + storage.
async function generateInvoice(order: any): Promise<string> {
  logger.info({ orderNo: order.orderNo, total: order.amounts?.total }, "[invoice] generated");
  return `/invoices/${order.orderNo}.pdf`;
}

async function notifyPaid(order: any) {
  await Notification.create({ user: order.user, audience: "user", channel: "inapp", type: "order_paid",
    title: "Payment received", body: `Order ${order.orderNo} is confirmed.`, data: { orderId: order._id } });
  await Notification.create({ audience: "admin", channel: "inapp", type: "new_order",
    title: "New paid order", body: `${order.orderNo} · ₹${order.amounts?.total}`, data: { orderId: order._id } });
  const user = order.user ? await User.findById(order.user) : null;
  if (user?.email) await enqueueEmail(user.email, "orderConfirmation", { orderNo: order.orderNo, total: order.amounts?.total });
}
