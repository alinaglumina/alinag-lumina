import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { asyncHandler, badRequest } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { type Owner, viewCart, addItem, setItemQty, removeItem, clearCart, mergeGuestCart } from "./service.js";

const r = Router();

// Resolve who the cart belongs to: the logged-in user, or a guest session id.
function owner(req: any): Owner {
  if (req.user?.sub) return { user: req.user.sub };
  const sid = (req.headers["x-session-id"] as string) || req.body?.sessionId || req.query?.sessionId;
  if (!sid) throw badRequest("Provide auth or an x-session-id for guest carts");
  return { sessionId: sid };
}

r.get("/cart", optionalAuth, asyncHandler(async (req, res) => res.json(await viewCart(owner(req)))));

r.post("/cart/items", optionalAuth, validate(z.object({ productId: z.string(), qty: z.number().int().positive().default(1), variant: z.string().optional() })),
  asyncHandler(async (req, res) => res.json(await addItem(owner(req), req.body.productId, req.body.qty, req.body.variant))));

r.patch("/cart/items", optionalAuth, validate(z.object({ productId: z.string(), qty: z.number().int(), variant: z.string().optional() })),
  asyncHandler(async (req, res) => res.json(await setItemQty(owner(req), req.body.productId, req.body.qty, req.body.variant))));

r.delete("/cart/items/:productId", optionalAuth, asyncHandler(async (req, res) =>
  res.json(await removeItem(owner(req), req.params.productId, req.query.variant as string | undefined))));

r.delete("/cart", optionalAuth, asyncHandler(async (req, res) => res.json(await clearCart(owner(req)))));

// Called right after login to fold the guest cart into the user's.
r.post("/cart/merge", requireAuth, validate(z.object({ sessionId: z.string() })),
  asyncHandler(async (req, res) => res.json(await mergeGuestCart(req.body.sessionId, req.user!.sub))));

// Convenience: issue a guest session id for a fresh visitor.
r.get("/cart/session", (_req, res) => res.json({ sessionId: "guest_" + crypto.randomBytes(12).toString("hex") }));

export const cartRoutes = r;
