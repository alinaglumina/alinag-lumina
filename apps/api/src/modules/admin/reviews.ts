import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { Review } from "../../models/Review.js";
import { moderate, recomputeProductRating } from "../reviews/service.js";
import { audit } from "../../utils/audit.js";

const r = Router();

// Moderation queue — filter by status (default pending), product, or rating.
r.get("/", validate(z.object({
  status: z.string().optional(), product: z.string().optional(), rating: z.coerce.number().optional(),
  page: z.coerce.number().default(1), limit: z.coerce.number().default(20),
}), "query"), asyncHandler(async (req, res) => {
  const { status, product, rating, page, limit } = req.query as any;
  const filter: any = {};
  if (status) filter.status = status;
  if (product) filter.product = product;
  if (rating) filter.rating = rating;
  const [items, total] = await Promise.all([
    Review.find(filter).populate("user", "name email").populate("product", "name slug")
      .sort("-createdAt").skip((page - 1) * limit).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

r.patch("/:id/moderate", validate(z.object({ status: z.enum(["approved", "rejected"]) })),
  asyncHandler(async (req, res) => {
    const review = await moderate(req.params.id, req.body.status);
    if (!review) throw notFound("Review not found");
    await audit(req, "review.moderate", "Review", req.params.id, undefined, { status: req.body.status });
    res.json({ review });
  }));

r.delete("/:id", asyncHandler(async (req, res) => {
  const before = await Review.findById(req.params.id).lean();
  if (!before) throw notFound("Review not found");
  await Review.findByIdAndDelete(req.params.id);
  await recomputeProductRating(String(before.product));
  await audit(req, "review.delete", "Review", req.params.id, before, null);
  res.json({ ok: true });
}));

export const adminReviewRoutes = r;
