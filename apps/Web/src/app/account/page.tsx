import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/services/product.service";
import { findSample } from "@/lib/sample";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { getReviews, type ReviewList } from "@/services/review.service";
import Reviews from "@/components/Reviews";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

async function load(slug: string) {
  try { const r = await getProduct(slug); if (r.product) return r.product as any; } catch {}
  return findSample(slug);
}

// Per-product SEO (title, description, canonical, OG) generated on the server.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return { title: "Product not found" };
  const title = p.seo?.title ?? p.name;
  const description = p.seo?.description ?? p.description ?? `Buy ${p.name} at Alinag Lumina.`;
  return {
    title, description,
    alternates: { canonical: `${SITE}/product/${p.slug}` },
    openGraph: { title, description, url: `${SITE}/product/${p.slug}`, images: p.images ?? [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();

  let reviewData: ReviewList = { reviews: [], distribution: {}, average: p.ratings?.average ?? 0, count: p.ratings?.count ?? 0 };
  try { reviewData = await getReviews(p._id); } catch {}

  const jsonLd = [
    productJsonLd(p),
    breadcrumbJsonLd([
      { name: "Home", url: SITE },
      { name: "Products", url: `${SITE}/products` },
      { name: p.name, url: `${SITE}/product/${p.slug}` },
    ]),
  ];

  return (
    <div className="wrap" style={{ margin: "30px auto" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 34 }}>
        <div style={{ height: 420, borderRadius: 20, display: "grid", placeItems: "center", fontSize: 130, background: "linear-gradient(135deg,#7c5cff,#b49bff)" }}>{p.glyph ?? "🛍️"}</div>
        <div>
          <h1 className="display" style={{ fontSize: 30 }}>{p.name}</h1>
          <div style={{ margin: "10px 0", color: "var(--ink-soft)" }}>SKU {p.sku ?? "—"} · {p.brand?.name ?? "Alinag Lumina"}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "16px 0" }}>
            <span className="display" style={{ fontSize: 30 }}>{inr(p.price)}</span>
            {p.mrp ? <span style={{ color: "var(--ink-soft)", textDecoration: "line-through" }}>{inr(p.mrp)}</span> : null}
          </div>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>{p.description ?? "A beautifully crafted piece from the Alinag Lumina collection."}</p>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button className="btn primary" style={{ height: 46, padding: "0 26px" }}>Add to cart</button>
            <button className="btn" style={{ height: 46, padding: "0 26px" }}>Buy now</button>
          </div>
        </div>
      </div>
      <Reviews productId={p._id} initial={reviewData} />
    </div>
  );
}
