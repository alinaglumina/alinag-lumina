import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { buildApp } from "../../src/server.js";
import request from "supertest";
import { setupTestDB } from "../setup/db.js";
import { registerUser, userWithRole, createProduct, bearer } from "../setup/helpers.js";
import { Product } from "../../src/models/Product.js";

const app = buildApp();
setupTestDB();
const address = { name: "U", line1: "1", city: "X", state: "Y", pincode: "515001", phone: "1" };

describe("inventory (integration)", () => {
  it("stock is reduced only after successful payment", async () => {
    const { token } = await registerUser(app, "inv@t.com");
    const p = await createProduct({ price: 1000, stock: 10 });

    // placing the order (pending) must NOT reduce stock yet
    const co = await request(app).post("/checkout").set(bearer(token))
      .send({ items: [{ productId: String(p._id), qty: 3 }], paymentMethod: "card", shippingAddress: address });
    expect((await Product.findById(p._id))!.stock).toBe(10);

    // pay → stock drops by 3
    const create = await request(app).post("/payments/create").set(bearer(token)).send({ orderId: co.body.orderId });
    const provider = create.body.razorpay.orderId;
    const paymentId = "pay_inv";
    const sig = crypto.createHmac("sha256", "checkout_secret_test").update(`${provider}|${paymentId}`).digest("hex");
    await request(app).post("/payments/verify").set(bearer(token))
      .send({ orderId: co.body.orderId, razorpay_order_id: provider, razorpay_payment_id: paymentId, razorpay_signature: sig });
    expect((await Product.findById(p._id))!.stock).toBe(7);
  });

  it("admin can adjust stock (set/delta) with a negative guard", async () => {
    const admin = await userWithRole(app, "invadm@t.com", "admin");
    const p = await createProduct({ stock: 5 });

    const set = await request(app).patch(`/admin/inventory/${p._id}`).set(bearer(admin)).send({ set: 50, reason: "restock" });
    expect(set.body.stock).toBe(50);

    const delta = await request(app).patch(`/admin/inventory/${p._id}`).set(bearer(admin)).send({ delta: -10 });
    expect(delta.body.stock).toBe(40);

    const negative = await request(app).patch(`/admin/inventory/${p._id}`).set(bearer(admin)).send({ delta: -1000 });
    expect(negative.status).toBe(400);
  });
});
