import { describe, it, expect, beforeAll } from "vitest";
beforeAll(() => { process.env.MONGODB_URI = "x"; process.env.JWT_SECRET = "a".repeat(20); process.env.JWT_REFRESH_SECRET = "b".repeat(20); delete process.env.REDIS_URL; });

describe("TOTP 2FA", () => {
  it("a code generated from the secret verifies; a wrong code fails", async () => {
    const { generateSecret, verifyTotp } = await import("../../src/lib/totp.js");
    const { authenticator } = await import("otplib");
    const secret = generateSecret();
    const code = authenticator.generate(secret);
    expect(verifyTotp(code, secret)).toBe(true);
    expect(verifyTotp("000000", secret)).toBe(false);
  });
  it("produces a scannable otpauth URL", async () => {
    const { generateSecret, otpauthURL } = await import("../../src/lib/totp.js");
    const uri = otpauthURL("user@test.com", generateSecret());
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("Alinag%20Lumina");
  });
});

describe("response cache (in-memory fallback)", () => {
  it("caches, returns hits without recomputing, and busts by tag", async () => {
    const { cacheWrap, invalidateTag, cacheEnabled } = await import("../../src/lib/cache.js");
    expect(cacheEnabled()).toBe(false);
    let calls = 0;
    const compute = () => { calls++; return Promise.resolve({ n: calls }); };

    const a = await cacheWrap("k1", 60, ["products"], compute);
    const b = await cacheWrap("k1", 60, ["products"], compute);
    expect(a).toEqual({ n: 1 });
    expect(b).toEqual({ n: 1 });      // served from cache, compute not called again
    expect(calls).toBe(1);

    await invalidateTag("products");
    const c = await cacheWrap("k1", 60, ["products"], compute);
    expect(c).toEqual({ n: 2 });      // recomputed after invalidation
    expect(calls).toBe(2);
  });
});
