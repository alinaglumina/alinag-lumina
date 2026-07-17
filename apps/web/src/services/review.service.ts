import { apiGet } from "@/lib/api";
export interface Review { _id: string; rating: number; title?: string; body?: string; verifiedPurchase?: boolean; user?: { name?: string }; createdAt?: string; helpfulCount?: number; }
export interface ReviewList { reviews: Review[]; distribution: Record<string, number>; average: number; count: number; }
export const getReviews = (productId: string) => apiGet<ReviewList>(`/products/${productId}/reviews`, { revalidate: 30 });
