import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { optionalAuth } from "../../middleware/auth.js";
import { snapshotCart, evaluateCoupon } from "./service.js";

const r = Router();

// Customer-facing: preview a coupon against a cart (prices resolved server-side).
// Auth is optional — pass a token to enforce per-user limits.
r.post("/coupons/validate", optionalAuth, validate(z.object({
  code: z.string().min(1),
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().positive() })).min(1),
})), asyncHandler(async (req, res) => {
  const cart = await snapshotCart(req.body.items);
  const result = await evaluateCoupon(req.body.code, cart, req.user?.sub);
  res.json({ ...result, subtotal: cart.subtotal, payable: Math.max(0, cart.subtotal - result.discount) });
}));

export const couponRoutes = r;
