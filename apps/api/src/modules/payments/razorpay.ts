import crypto from "node:crypto";
import { env } from "../../config/env.js";

const { RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET } = env;

export const razorpayConfigured = () => Boolean(KEY_ID && KEY_SECRET);
export const publicKeyId = () => KEY_ID;

export interface RzpOrder { id: string; amount: number; currency: string; stub?: boolean; }

// Create an order on Razorpay (amount in paise). Falls back to a stub when unconfigured.
export async function createRazorpayOrder(amountPaise: number, receipt: string): Promise<RzpOrder> {
  if (!razorpayConfigured())
    return { id: "order_stub_" + crypto.randomBytes(8).toString("hex"), amount: amountPaise, currency: "INR", stub: true };
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, payment_capture: 1 }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as RzpOrder;
}

// Issue a refund for a captured payment.
export async function refundPayment(paymentId: string, amountPaise?: number) {
  if (!razorpayConfigured()) return { id: "rfnd_stub_" + crypto.randomBytes(6).toString("hex"), status: "processed", stub: true };
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(amountPaise ? { amount: amountPaise } : {}),
  });
  if (!res.ok) throw new Error(`Razorpay refund failed (${res.status}): ${await res.text()}`);
  return res.json();
}

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a ?? ""), bb = Buffer.from(b ?? "");
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

// hmac_sha256(order_id + "|" + payment_id, key_secret) === razorpay_signature
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!KEY_SECRET) return false;
  return safeEqual(crypto.createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex"), signature);
}
// hmac_sha256(rawBody, webhook_secret) === x-razorpay-signature
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  return safeEqual(crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex"), signature);
}
