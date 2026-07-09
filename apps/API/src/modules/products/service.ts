import { Product } from "../../models/Product.js";
import { cacheWrap } from "../../lib/cache.js";

export interface ProductQuery {
  q?: string; category?: string; brand?: string;
  minPrice?: number; maxPrice?: number; rating?: number;
  color?: string; size?: string; inStock?: boolean; discount?: number; newArrivals?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "rating" | "newest";
  page?: number; limit?: number;
}

export async function listProducts(qp: ProductQuery) {
  return cacheWrap(`products:list:${JSON.stringify(qp)}`, 60, ["products"], async () => {
  const filter: any = { status: "active" };
  if (qp.q) filter.$text = { $search: qp.q };                              // typo-tolerant text index
  if (qp.category) filter.$or = [{ category: qp.category }, { subcategory: qp.category }];
  if (qp.brand) filter.brand = qp.brand;
  if (qp.color) filter.colors = qp.color;
  if (qp.size) filter.sizes = qp.size;
  if (qp.rating) filter["ratings.average"] = { $gte: qp.rating };
  if (qp.discount) filter.discountPercent = { $gte: qp.discount };
  if (qp.newArrivals) filter.isNewArrival = true;
  if (qp.inStock) filter.stock = { $gt: 0 };
  if (qp.minPrice != null || qp.maxPrice != null)
    filter.price = { ...(qp.minPrice != null && { $gte: qp.minPrice }), ...(qp.maxPrice != null && { $lte: qp.maxPrice }) };

  const sortMap: Record<string, any> = {
    price_asc: { price: 1 }, price_desc: { price: -1 },
    rating: { "ratings.average": -1 }, newest: { createdAt: -1 },
    relevance: qp.q ? { score: { $meta: "textScore" } } : { featured: -1, createdAt: -1 },
  };
  const page = Math.max(1, qp.page ?? 1);
  const limit = Math.min(60, qp.limit ?? 24);

  const cursor = Product.find(filter, qp.q ? { score: { $meta: "textScore" } } : {})
    .populate("brand", "name slug").populate("category", "name slug")
    .sort(sortMap[qp.sort ?? "relevance"]).skip((page - 1) * limit).limit(limit).lean();

  const [items, total] = await Promise.all([cursor, Product.countDocuments(filter)]);
  return { items, total, page, pages: Math.ceil(total / limit) };
  });
}

export async function getBySlug(slug: string) {
  return cacheWrap(`products:slug:${slug}`, 120, ["products"], async () => {
  const product = await Product.findOne({ slug, status: "active" })
    .populate("brand", "name slug").populate("category", "name slug")
    .populate("related", "name slug price mrp images ratings").lean();
  return product;
  });
}

// Lightweight autocomplete for instant search.
export async function autocomplete(q: string) {
  if (!q || q.length < 2) return [];
  return Product.find({ status: "active", name: { $regex: q, $options: "i" } })
    .select("name slug price images").limit(8).lean();
}
