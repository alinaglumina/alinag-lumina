import { describe, it, expect, beforeAll } from "vitest";
beforeAll(() => { process.env.MONGODB_URI = "x"; process.env.JWT_SECRET = "a".repeat(20); process.env.JWT_REFRESH_SECRET = "b".repeat(20); });

describe("checkout pricing", () => {
  it("shipping tiers + free thresholds", async () => {
    const { shippingQuote } = await import("../../src/modules/checkout/service.js");
    expect(shippingQuote("standard", 3400, false)).toBe(0);
    expect(shippingQuote("standard", 500, false)).toBe(49);
    expect(shippingQuote("express", 500, false)).toBe(99);
    expect(shippingQuote("same_day", 500, false)).toBe(149);
    expect(shippingQuote("express", 500, true)).toBe(0);
  });
  it("GST-inclusive tax component", async () => {
    const { inclusiveTax } = await import("../../src/modules/checkout/service.js");
    const lines = [{ product: "A", name: "A", qty: 2, price: 1000, gstPercent: 18 }, { product: "B", name: "B", qty: 1, price: 500, gstPercent: 18 }, { product: "C", name: "C", qty: 3, price: 300, gstPercent: 5 }];
    expect(inclusiveTax(lines as any)).toBe(424);
  });
});
