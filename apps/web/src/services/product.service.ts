import { apiGet } from "@/lib/api";
export interface Product { _id: string; name: string; slug: string; price: number; mrp?: number; images?: string[]; glyph?: string; ratings?: { average: number; count: number }; brand?: any; stock?: number; description?: string; seo?: any; sku?: string; }
export interface ProductList { items: Product[]; total: number; page: number; pages: number; }

export const getProducts = (qs = "") => apiGet<ProductList>(`/products${qs ? `?${qs}` : ""}`, { revalidate: 60, tags: ["products"] });
export const getProduct = (slug: string) => apiGet<{ product: Product }>(`/products/${slug}`, { revalidate: 120, tags: [`product:${slug}`] });
export const autocomplete = (q: string) => apiGet<{ suggestions: Product[] }>(`/products/autocomplete?q=${encodeURIComponent(q)}`, { revalidate: 0 });
