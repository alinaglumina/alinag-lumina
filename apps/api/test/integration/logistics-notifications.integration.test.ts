import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { buildApp } from "../../src/server.js";
import request from "supertest";
import { setupTestDB } from "../setup/db.js";
import { registerUser, userWithRole, createProduct, bearer } from "../setup/helpers.js";

const app = buildApp();
setupTestDB();
const address = { name: "U", line1: "1", city: "X", state: "Y", pincode: "515001", phone: "1" };

async function paidOrder(token: string, product: any) {
  const co = await request(app).post("/checkout").set(bearer(token))
    .send({ items: [{ productId: String(product._id), qty: 1 }], paymentMethod: "card", shippingAddress: address });
  const create = await request(app).post("/payments/create").set(bearer(token)).send({ orderId: co.body.orderId });
  const provider = create.body.razorpay.orderId; const paymentId = "pay_" + crypto.randomBytes(3).toString("hex");
  const sig = crypto.createHmac("sha256", "checkout_secret_test").update(`${provider}|${paymentId}`).digest("hex");
  await request(app).post("/payments/verify").set(bearer(token))
    .send({ orderId: co.body.orderId, razorpay_order_id: provider, razorpay_payment_id: paymentId, razorpay_signature: sig });
  return co.body.orderId;
}

describe("logistics + notifications (integration)", () => {
  it("ship → track → webhook delivery, with customer notifications", async () => {
    const admin = await userWithRole(app, "ops@t.com", "admin");
    const { token } = await registerUser(app, "cust@t.com");
    const p = await createProduct({ price: 1200, stock: 5 });
    const orderId = await paidOrder(token, p);

    // paid order already generated an in-app notification
    const inbox0 = await request(app).get("/me/notifications").set(bearer(token));
    expect(inbox0.body.items.length).toBeGreaterThanOrEqual(1);

    // admin ships → shipment assigned + status shipped
    const ship = await request(app).post(`/admin/orders/${orderId}/ship`).set(bearer(admin));
    expect(ship.status).toBe(200);
    const awb = ship.body.order.shipment.awb;
    expect(awb).toBeTruthy();

    // customer tracks
    const trk = await request(app).get(`/orders/${orderId}/track`).set(bearer(token));
    expect(trk.status).toBe(200);
    expect(trk.body.shipment.status).toBe("shipped");

    // provider webhook → delivered
    const hook = await request(app).post("/logistics/webhook").send({ awb, status: "delivered" });
    expect(hook.status).toBe(200);
    const trk2 = await request(app).get(`/orders/${orderId}/track`).set(bearer(token));
    expect(trk2.body.shipment.status).toBe("delivered");
    expect(trk2.body.status).toBe("delivered");

    // notifications accumulated; mark all read
    const inbox = await request(app).get("/me/notifications").set(bearer(token));
    expect(inbox.body.items.length).toBeGreaterThan(inbox0.body.items.length);
    await request(app).post("/me/notifications/read-all").set(bearer(token));
    const count = await request(app).get("/me/notifications/unread-count").set(bearer(token));
    expect(count.body.unread).toBe(0);
  });

  it("cannot track someone else's order", async () => {
    const { token: a } = await registerUser(app, "a@t.com");
    const { token: b } = await registerUser(app, "b@t.com");
    const p = await createProduct();
    const orderId = await paidOrder(a, p);
    expect((await request(app).get(`/orders/${orderId}/track`).set(bearer(b))).status).toBe(404);
  });
});
