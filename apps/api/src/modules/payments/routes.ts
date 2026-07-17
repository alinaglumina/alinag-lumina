import { Router } from "express";
import { z } from "zod";
import { asyncHandler, badRequest, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { Order } from "../../models/Order.js";
import { audit } from "../../utils/audit.js";
import { logger } from "../../lib/logger.js";
import {
  createRazorpayOrder, refundPayment, verifyCheckoutSignature, verifyWebhookSignature,
  publicKeyId, razorpayConfigured,
} from "./razorpay.js";
import { attachProviderOrder, getByProviderOrder, settle } from "./service.js";

const r = Router();

// 1) Create the Razorpay order for an existing (pending) Order → return keyId + orderId.
r.post("/payments/create", requireAuth, validate(z.object({ orderId: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.body.orderId);
    if (!order) throw notFound("Order not found");
    if (order.payment!.status !== "pending") throw badRequest("Order is not payable");
    const amountPaise = Math.round((order.amounts?.total ?? 0) * 100);
    const rzp = await createRazorpayOrder(amountPaise, order.orderNo!);
    await attachProviderOrder(String(order._id), rzp.id);
    res.json({
      order: { id: order._id, orderNo: order.orderNo, amount: order.amounts?.total },
      razorpay: { keyId: publicKeyId(), orderId: rzp.id, amount: rzp.amount, currency: rzp.currency, configured: razorpayConfigured() },
    });
  }));

// 2) Browser success callback — verify signature, then settle paid (idempotent).
r.post("/payments/verify", requireAuth,
  validate(z.object({ orderId: z.string(), razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() })),
  asyncHandler(async (req, res) => {
    const b = req.body;
    if (!verifyCheckoutSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
      await settle(b.orderId, "failed", "signature_mismatch", b.razorpay_payment_id);
      throw badRequest("Payment signature verification failed");
    }
    const order = await settle(b.orderId, "paid", undefined, b.razorpay_payment_id);
    res.json({ order: { id: order._id, status: order.payment!.status, invoiceUrl: order.invoiceUrl } });
  }));

r.post("/payments/:orderId/cancel", requireAuth, asyncHandler(async (req, res) => {
  const order = await settle(req.params.orderId, "cancelled", "user_cancelled");
  res.json({ status: order.payment!.status });
}));

// Admin: refund a paid order.
r.post("/payments/:orderId/refund", requireAuth, requireRole("admin", "superadmin"),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId);
    if (!order) throw notFound("Order not found");
    if (order.payment!.status !== "paid") throw badRequest("Only paid orders can be refunded");
    const refund = await refundPayment(order.payment!.providerPaymentId!, Math.round((order.amounts?.total ?? 0) * 100));
    order.payment!.status = "refunded"; order.status = "returned"; await order.save();
    await audit(req, "order.refund", "Order", String(order._id), { status: "paid" }, { status: "refunded", refund });
    res.json({ ok: true, refund });
  }));

r.get("/orders/:orderId/payment", requireAuth, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId).select("orderNo payment amounts status invoiceUrl");
  if (!order) throw notFound("Order not found");
  res.json({ order });
}));

// 3) Webhook — signature-verified source of truth (uses raw body captured in server.ts).
r.post("/payments/webhook", asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const raw = (req as any).rawBody as Buffer;
  if (!verifyWebhookSignature(raw, signature)) { res.status(400).json({ ok: false, error: "invalid_signature" }); return; }
  const evt = req.body as any;
  const entity = evt?.payload?.payment?.entity;
  const order = entity?.order_id ? await getByProviderOrder(entity.order_id) : null;
  if (order) {
    if (evt.event === "payment.captured") await settle(String(order._id), "paid", undefined, entity.id);
    else if (evt.event === "payment.failed") await settle(String(order._id), "failed", entity?.error_description ?? "failed", entity?.id);
    logger.info({ event: evt.event, order: order.orderNo }, "[webhook] processed");
  }
  res.json({ ok: true }); // always 200 quickly
}));

export const paymentRoutes = r;
