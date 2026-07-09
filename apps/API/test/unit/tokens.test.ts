import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";

beforeAll(() => {
  process.env.MONGODB_URI = "mongodb://localhost/test";
  process.env.JWT_SECRET = "unit-access-secret-000000";
  process.env.JWT_REFRESH_SECRET = "unit-refresh-secret-00000";
  process.env.RAZORPAY_KEY_SECRET = "checkout_secret_abc";
  process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_xyz";
});

describe("JWT + refresh tokens", () => {
  it("signs and verifies an access token", async () => {
    const { signAccess, verifyAccess } = await import("../../src/lib/tokens.js");
    const t = signAccess({ sub: "u1", role: "customer", sid: "s1" });
    const claims = verifyAccess(t);
    expect(claims.sub).toBe("u1"); expect(claims.role).toBe("customer");
  });
  it("hashes refresh tokens deterministically and uniquely", async () => {
    const { newRefreshToken, hashToken } = await import("../../src/lib/tokens.js");
    const a = newRefreshToken(), b = newRefreshToken();
    expect(a).not.toBe(b);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(hashToken(b));
  });
});

describe("Razorpay signatures", () => {
  it("verifies a valid checkout signature and rejects tampering", async () => {
    const { verifyCheckoutSignature } = await import("../../src/modules/payments/razorpay.js");
    const sig = crypto.createHmac("sha256", "checkout_secret_abc").update("order_1|pay_1").digest("hex");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig)).toBe(true);
    expect(verifyCheckoutSignature("order_1", "pay_1", "bad")).toBe(false);
  });
  it("verifies a valid webhook signature and rejects tampering", async () => {
    const { verifyWebhookSignature } = await import("../../src/modules/payments/razorpay.js");
    const body = JSON.stringify({ event: "payment.captured" });
    const sig = crypto.createHmac("sha256", "whsec_xyz").update(body).digest("hex");
    expect(verifyWebhookSignature(Buffer.from(body), sig)).toBe(true);
    expect(verifyWebhookSignature(Buffer.from(body), "nope")).toBe(false);
  });
});
