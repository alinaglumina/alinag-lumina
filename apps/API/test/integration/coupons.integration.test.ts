import { describe, it, expect } from "vitest";
import { buildApp } from "../../src/server.js";
import request from "supertest";
import { setupTestDB } from "../setup/db.js";
import { registerUser, userWithRole, createProduct, bearer } from "../setup/helpers.js";
import { Coupon } from "../../src/models/Coupon.js";
import { Order } from "../../src/models/Order.js";

const app = buildApp();
setupTestDB();

describe("coupon redemption limits & validation (integration)", () => {
  it("admin creates a coupon; validation enforces min-cart, expiry, usage & per-user limits", async () => {
    const admin = await userWithRole(app, "admin@t.com", "admin");
    const { token, id: userId } = await registerUser(app, "shopper@t.com");
    const p = await createProduct({ price: 1000, stock: 20 });

    // create via admin API
    const created = await request(app).post("/admin/coupons").set(bearer(admin))
      .send({ code: "SAVE10", type: "percent", value: 10, cap: 500, minCartValue: 1500, usageLimit: 100, perUserLimit: 1 });
    expect(created.status).toBe(201);

    const validate = (items: any[], tok?: string) => {
      const r = request(app).post("/coupons/validate");
      if (tok) r.set(bearer(tok));
      return r.send({ code: "SAVE10", items });
    };

    // below min-cart (1×1000 < 1500) → rejected
    const below = await validate([{ productId: String(p._id), qty: 1 }]);
    expect(below.status).toBe(400);

    // valid (2×1000 = 2000) → 10% = 200
    const okRes = await validate([{ productId: String(p._id), qty: 2 }], token);
    expect(okRes.status).toBe(200);
    expect(okRes.body.discount).toBe(200);

    // expired coupon → rejected
    await Coupon.updateOne({ code: "SAVE10" }, { expiresAt: new Date(Date.now() - 1000) });
    const expired = await validate([{ productId: String(p._id), qty: 2 }], token);
    expect(expired.status).toBe(400);
    await Coupon.updateOne({ code: "SAVE10" }, { $unset: { expiresAt: 1 } });

    // per-user limit: record a prior PAID order that used the coupon → user is now over the limit
    await Order.create({ orderNo: "PRIOR-1", user: userId, items: [], amounts: { total: 2000 }, coupon: { code: "SAVE10", discount: 200 }, payment: { status: "paid" } });
    const overUser = await validate([{ productId: String(p._id), qty: 2 }], token);
    expect(overUser.status).toBe(400);

    // global usage limit reached → rejected (for anyone)
    await Coupon.updateOne({ code: "SAVE10" }, { usedCount: 100 });
    const overGlobal = await validate([{ productId: String(p._id), qty: 2 }]);
    expect(overGlobal.status).toBe(400);
  });
});
