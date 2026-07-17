import { describe, it, expect, beforeAll } from "vitest";
beforeAll(() => { process.env.MONGODB_URI = "x"; process.env.JWT_SECRET = "a".repeat(20); process.env.JWT_REFRESH_SECRET = "b".repeat(20); });

describe("coupon discount engine", () => {
  const cart = { lines: [{ product: "A", qty: 2, price: 1000 }, { product: "B", qty: 1, price: 500 }, { product: "C", qty: 3, price: 300 }], subtotal: 3400 };
  it("percent with cap", async () => {
    const { computeDiscount } = await import("../../src/modules/coupons/service.js");
    expect(computeDiscount({ code: "P", type: "percent", value: 10 }, cart)).toEqual({ discount: 340, freeShipping: false });
    expect(computeDiscount({ code: "P", type: "percent", value: 50, cap: 500 }, cart)).toEqual({ discount: 500, freeShipping: false });
  });
  it("fixed clamps to subtotal", async () => {
    const { computeDiscount } = await import("../../src/modules/coupons/service.js");
    expect(computeDiscount({ code: "F", type: "fixed", value: 99999 }, cart).discount).toBe(3400);
  });
  it("free shipping flag", async () => {
    const { computeDiscount } = await import("../../src/modules/coupons/service.js");
    expect(computeDiscount({ code: "S", type: "free_shipping" }, cart)).toEqual({ discount: 0, freeShipping: true });
  });
  it("BXGY frees cheapest per set, scoped", async () => {
    const { computeDiscount } = await import("../../src/modules/coupons/service.js");
    expect(computeDiscount({ code: "B", type: "bxgy", bxgy: { buyQty: 2, getQty: 1 } }, cart).discount).toBe(600);
    expect(computeDiscount({ code: "B", type: "bxgy", bxgy: { buyQty: 2, getQty: 1, productScope: ["C"] } }, cart).discount).toBe(300);
  });
});
