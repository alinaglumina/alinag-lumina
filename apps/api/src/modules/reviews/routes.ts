import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { createReview, listApproved, markHelpful } from "./service.js";

const r = Router();

// Public: approved reviews for a product (+ rating distribution + sort).
r.get("/products/:productId/reviews", validate(z.object({ sort: z.string().optional() }), "query"),
  asyncHandler(async (req, res) => res.json(await listApproved(req.params.productId, (req.query as any).sort))));

// Auth: submit a review (one per product per user; verified-purchase auto-detected; enters moderation).
r.post("/reviews", requireAuth, validate(z.object({
  product: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(4000).optional(),
  images: z.array(z.string()).max(6).optional(),
  videos: z.array(z.string()).max(2).optional(),
})), asyncHandler(async (req, res) => {
  const review = await createReview(req.user!.sub, req.body);
  res.status(201).json({ review, note: "Submitted for moderation" });
}));

r.post("/reviews/:id/helpful", requireAuth, asyncHandler(async (req, res) => res.json(await markHelpful(req.params.id))));

export const reviewRoutes = r;
