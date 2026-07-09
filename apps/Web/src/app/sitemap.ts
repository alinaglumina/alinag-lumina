import type { MetadataRoute } from "next";
import { getProducts } from "@/services/product.service";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls = ["", "/products", "/about", "/contact", "/faq", "/privacy-policy", "/terms", "/shipping-policy", "/return-policy", "/track"]
    .map((p) => ({ url: `${SITE}${p}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 }));
  let products: MetadataRoute.Sitemap = [];
  try {
    const r = await getProducts("limit=60&sort=newest");
    products = (r.items ?? []).map((p) => ({ url: `${SITE}/product/${p.slug}`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.8 }));
  } catch {}
  return [...staticUrls, ...products];
}
