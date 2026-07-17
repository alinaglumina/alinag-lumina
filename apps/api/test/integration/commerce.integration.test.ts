import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import request from "supertest";
import { buildApp } from "../../src/server.js";
import { setupTestDB } from "../setup/db.js";
import { Product } from "../../src/models/Product.js";

const app = buildApp();
setupTestDB();
const authToken = async (email: string) => (await request(app).post("/auth/register").send({ name: "U", email, password: "password123" })).body.accessToken;

describe("commerce flow (integration)", () => {
  it("cart → checkout → pay (signature) → inventory reduced", async () => {
    const p = await Product.create({ name: "Tee", slug: "tee", price: 1000, gstPercent: 18, stock: 5, status: "active" });
    const token = await authToken("buyer@test.com");

    await request(app).post("/cart/items").set("Authorization", `Bearer ${token}`).send({ productId: String(p._id), qty: 2 });

    const co = await request(app).post("/checkout").set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: String(p._id), qty: 2 }], paymentMethod: "card", deliveryType: "standard",
        shippingAddress: { name: "U", line1: "1 St", city: "Anantapur", state: "AP", pincode: "515001", phone: "9999" } });
    expect(co.status).toBe(201);
    expect(co.body.amounts.total).toBe(2000);          // 2×1000, free shipping >₹999
    const orderId = co.body.orderId;

    const create = await request(app).post("/payments/create").set("Authorization", `Bearer ${token}`).send({ orderId });
    expect(create.status).toBe(200);
    const providerOrderId = create.body.razorpay.orderId;

    const paymentId = "pay_test_123";
    const sig = crypto.createHmac("sha256", "checkout_secret_test").update(`${providerOrderId}|${paymentId}`).digest("hex");
    const verify = await request(app).post("/payments/verify").set("Authorization", `Bearer ${token}`)
      .send({ orderId, razorpay_order_id: providerOrderId, razorpay_payment_id: paymentId, razorpay_signature: sig });
    expect(verify.status).toBe(200);
    expect(verify.body.order.status).toBe("paid");

    const fresh = await Product.findById(p._id);
    expect(fresh!.stock).toBe(3);                       // inventory reduced on payment success
  });

  it("rejects a tampered payment signature", async () => {
    const p = await Product.create({ name: "Cap", slug: "cap", price: 500, stock: 3, status: "active" });
    const token = await authToken("buyer2@test.com");
    const co = await request(app).post("/checkout").set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: String(p._id), qty: 1 }], paymentMethod: "upi",
        shippingAddress: { name: "U", line1: "1", city: "X", state: "Y", pincode: "515001", phone: "1" } });
    const create = await request(app).post("/payments/create").set("Authorization", `Bearer ${token}`).send({ orderId: co.body.orderId });
    const bad = await request(app).post("/payments/verify").set("Authorization", `Bearer ${token}`)
      .send({ orderId: co.body.orderId, razorpay_order_id: create.body.razorpay.orderId, razorpay_payment_id: "pay_x", razorpay_signature: "deadbeef" });
    expect(bad.status).toBe(400);
  });
});
