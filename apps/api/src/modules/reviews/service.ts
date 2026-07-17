import { Review } from "../../models/Review.js";
import { Product } from "../../models/Product.js";
import { Order } from "../../models/Order.js";
import { badRequest } from "../../lib/http.js";

// ── Pure helpers (unit-testable) ─────────────────────────────────────────────
export function computeAggregate(ratings: number[]): { average: number; count: number } {
  if (!ratings.length) return { average: 0, count: 0 };
  const sum = ratings.reduce((s, r) => s + r, 0);
  return { average: Math.round((sum / ratings.length) * 10) / 10, count: ratings.length };
}
export function ratingDistribution(ratings: number[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  ratings.forEach((r) => { if (r >= 1 && r <= 5) dist[r as 1 | 2 | 3 | 4 | 5] += 1; });
  return dist;
}

// ── DB-backed ────────────────────────────────────────────────────────────────
export async function hasPurchased(userId: string, productId: string): Promise<boolean> {
  return !!(await Order.exists({ user: userId, "items.product": productId, "payment.status": "paid" }));
}

// Recompute a product's rating from its APPROVED reviews only.
export async function recomputeProductRating(productId: string) {
  const approved = await Review.find({ product: productId, status: "approved" }).select("rating").lean();
  const agg = computeAggregate(approved.map((r: any) => r.rating));
  await Product.updateOne({ _id: productId }, { ratings: agg });
  return agg;
}

export async function createReview(userId: string, input: { product: string; rating: number; title?: string; body?: string; images?: string[]; videos?: string[] }) {
  const existing = await Review.findOne({ product: input.product, user: userId });
  if (existing) throw badRequest("You've already reviewed this product");
  const verifiedPurchase = await hasPurchased(userId, input.product);
  const review = await Review.create({ ...input, user: userId, verifiedPurchase, status: "pending" });
  return review;   // visible after moderation approves it
}

// Public listing: approved reviews + distribution + sort.
export async function listApproved(productId: string, sort = "recent") {
  const sortMap: Record<string, any> = { recent: { createdAt: -1 }, helpful: { helpfulCount: -1 }, rating_high: { rating: -1 }, rating_low: { rating: 1 } };
  const reviews = await Review.find({ product: productId, status: "approved" })
    .populate("user", "name avatar").sort(sortMap[sort] ?? sortMap.recent).lean();
  const dist = ratingDistribution(reviews.map((r: any) => r.rating));
  const agg = computeAggregate(reviews.map((r: any) => r.rating));
  return { reviews, distribution: dist, ...agg };
}

export async function markHelpful(reviewId: string) {
  const review = await Review.findByIdAndUpdate(reviewId, { $inc: { helpfulCount: 1 } }, { new: true });
  return { helpfulCount: review?.helpfulCount ?? 0 };
}

// Moderation → set status, then recompute the product aggregate.
export async function moderate(reviewId: string, status: "approved" | "rejected") {
  const review = await Review.findByIdAndUpdate(reviewId, { status }, { new: true });
  if (review) await recomputeProductRating(String(review.product));
  return review;
}
