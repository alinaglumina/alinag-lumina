import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { buildApp } from "../../src/server.js";
import request from "supertest";
import { setupTestDB } from "../setup/db.js";
import { registerUser, userWithRole, createProduct, bearer } from "../setup/helpers.js";
import { Product } from "../../src/models/Product.js";

const app = buildApp();
setupTestDB();

const address = { name: "U", line1: "1 St", city: "Anantapur", state: "AP", pincode: "515001", phone: "9999" };
async function paidOrder(token: string, product: any, qty = 1) {
  const co = await request(app).post("/checkout").set(bearer(token))
    .send({ items: [{ productId: String(product._id), qty }], paymentMethod: "card", deliveryType: "standard", shippingAddress: address });
  const orderId = co.body.orderId;
  const create = await request(app).post("/payments/create").set(bearer(token)).send({ orderId });
  const provider = create.body.razorpay.orderId;
  const paymentId = "pay_" + Math.random().toString(36).slice(2);
  const sig = crypto.createHmac("sha256", "checkout_secret_test").update(`${provider}|${paymentId}`).digest("hex");
  await request(app).post("/payments/verify").set(bearer(token))
    .send({ orderId, razorpay_order_id: provider, razorpay_payment_id: paymentId, razorpay_signature: sig });
  return orderId;
}

describe("refund & cancellation (integration)", () => {
  it("admin refunds a paid order → refunded/returned", async () => {
    const admin = await userWithRole(app, "adm@t.com", "admin");
    const { token } = await registerUser(app, "b1@t.com");
    const p = await createProduct({ price: 1500, stock: 5 });
    const orderId = await paidOrder(token, p);

    const refund = await request(app).post(`/payments/${orderId}/refund`).set(bearer(admin));
    expect(refund.status).toBe(200);
    expect(refund.body.ok).toBe(true);

    const detail = await request(app).get(`/orders/${orderId}/payment`).set(bearer(token));
    expect(detail.body.order.payment.status).toBe("refunded");
    expect(detail.body.order.status).toBe("returned");
  });

  it("refund on an unpaid order is rejected", async () => {
    const admin = await userWithRole(app, "adm2@t.com", "admin");
    const { token } = await registerUser(app, "b2@t.com");
    const p = await createProduct({ price: 500, stock: 5 });
    const co = await request(app).post("/checkout").set(bearer(token))
      .send({ items: [{ productId: String(p._id), qty: 1 }], paymentMethod: "upi", shippingAddress: address });
    const bad = await request(app).post(`/payments/${co.body.orderId}/refund`).set(bearer(admin));
    expect(bad.status).toBe(400);
  });

  it("cancel before payment → cancelled", async () => {
    const { token } = await registerUser(app, "b3@t.com");
    const p = await createProduct({ price: 800, stock: 5 });
    const co = await request(app).post("/checkout").set(bearer(token))
      .send({ items: [{ productId: String(p._id), qty: 1 }], paymentMethod: "upi", shippingAddress: address });
    const cancel = await request(app).post(`/payments/${co.body.orderId}/cancel`).set(bearer(token));
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe("cancelled");
  });
});
