import { describe, it, expect, beforeAll } from "vitest";
beforeAll(() => { process.env.MONGODB_URI = "x"; process.env.JWT_SECRET = "a".repeat(20); process.env.JWT_REFRESH_SECRET = "b".repeat(20); });

describe("cart merge", () => {
  it("sums quantities per product+variant", async () => {
    const { mergeItems } = await import("../../src/modules/cart/service.js");
    const m = mergeItems([{ product: "A", qty: 1 }, { product: "B", variant: "M", qty: 2 }], [{ product: "A", qty: 3 }, { product: "B", variant: "L", qty: 1 }]);
    expect(m.find((i) => i.product === "A")?.qty).toBe(4);
    expect(m.length).toBe(3);
  });
});
describe("review aggregates", () => {
  it("rounds average to 1dp and builds distribution", async () => {
    const { computeAggregate, ratingDistribution } = await import("../../src/modules/reviews/service.js");
    expect(computeAggregate([5, 4, 4])).toEqual({ average: 4.3, count: 3 });
    expect(ratingDistribution([5, 5, 4, 1])).toEqual({ 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 });
  });
});
describe("analytics", () => {
  it("growth, aov, conversion, gap-fill", async () => {
    const { growthPct, aov, conversionRate, fillDailySeries } = await import("../../src/lib/analytics.js");
    expect(growthPct(150, 100)).toBe(50);
    expect(growthPct(10, 0)).toBe(100);
    expect(aov(6120, 2)).toBe(3060);
    expect(conversionRate(5, 20)).toBe(25);
    expect(fillDailySeries([{ date: "2026-01-02", value: 5 }], new Date("2026-01-01"), new Date("2026-01-02"))).toEqual([{ date: "2026-01-01", value: 0 }, { date: "2026-01-02", value: 5 }]);
  });
});
describe("permissions", () => {
  it("role → permission matrix", async () => {
    const { can } = await import("../../src/lib/permissions.js");
    expect(can("superadmin", "settings.delete")).toBe(true);
    expect(can("admin", "products.create")).toBe(true);
    expect(can("staff", "reviews.moderate")).toBe(true);
    expect(can("staff", "products.delete")).toBe(false);
    expect(can("vendor", "products.update")).toBe(true);
    expect(can("vendor", "inventory.adjust")).toBe(true);
    expect(can("vendor", "settings.update")).toBe(false);
    expect(can("vendor", "coupons.create")).toBe(false);
    expect(can("customer", "products.read")).toBe(false);
  });
});
