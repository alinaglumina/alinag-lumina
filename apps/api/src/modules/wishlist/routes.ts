import { Router } from "express";
import { z } from "zod";
import { asyncHandler, badRequest, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { type Owner, viewWishlist, toggle, remove, makeShareable, getShared, mergeGuestWishlist } from "./service.js";

const r = Router();
function owner(req: any): Owner {
  if (req.user?.sub) return { user: req.user.sub };
  const sid = (req.headers["x-session-id"] as string) || req.body?.sessionId || req.query?.sessionId;
  if (!sid) throw badRequest("Provide auth or an x-session-id for guest wishlists");
  return { sessionId: sid };
}

r.get("/wishlist", optionalAuth, asyncHandler(async (req, res) => res.json(await viewWishlist(owner(req)))));
r.post("/wishlist/toggle", optionalAuth, validate(z.object({ productId: z.string() })),
  asyncHandler(async (req, res) => res.json(await toggle(owner(req), req.body.productId))));
r.delete("/wishlist/:productId", optionalAuth, asyncHandler(async (req, res) => res.json(await remove(owner(req), req.params.productId))));
r.post("/wishlist/share", optionalAuth, asyncHandler(async (req, res) => res.json(await makeShareable(owner(req)))));
r.post("/wishlist/merge", requireAuth, validate(z.object({ sessionId: z.string() })),
  asyncHandler(async (req, res) => res.json(await mergeGuestWishlist(req.body.sessionId, req.user!.sub))));

// Public shared wishlist view.
r.get("/wishlist/shared/:shareId", asyncHandler(async (req, res) => {
  const wl = await getShared(req.params.shareId);
  if (!wl) throw notFound("Shared wishlist not found");
  res.json(wl);
}));

export const wishlistRoutes = r;
