import ProductCard from "@/components/ProductCard";
import Filters from "@/components/Filters";
import { getProducts } from "@/services/product.service";
import { SAMPLE } from "@/lib/sample";

export const metadata = { title: "Shop all products", description: "Browse the full Alinag Lumina catalogue with filters for price, brand, rating, colour and more." };

// SSR listing with filters via query string. searchParams drives the API query.
export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(sp as any).toString();
  let items = SAMPLE, total = SAMPLE.length;
  try { const r = await getProducts(qs); if (r.items) { items = r.items as any; total = r.total; } } catch {}
  return (
    <div className="wrap layout">
      <Filters />
      <div>
        <h1 className="sec-title">{sp.q ? `Results for “${sp.q}”` : "All products"} <span style={{ color: "var(--ink-soft)", fontSize: 14 }}>({total})</span></h1>
        <div className="grid">{items.map((p, i) => <ProductCard key={p._id} p={p} i={i} />)}</div>
      </div>
    </div>
  );
}
