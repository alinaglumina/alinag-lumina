import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/services/product.service";
import { SAMPLE } from "@/lib/sample";

// SSR home — server-fetches featured products (falls back to sample if API is down).
export default async function HomePage() {
  let items = SAMPLE;
  try { const r = await getProducts("limit=8&sort=newest"); if (r.items?.length) items = r.items as any; } catch {}
  return (
    <div className="wrap">
      <section className="hero">
        <h1 className="display">The Fashion Edit, reimagined.</h1>
        <p>Dresses, sneakers, ethnic wear and more — up to 80% off, delivered fast with secure payments.</p>
        <div style={{ marginTop: 22, display: "flex", gap: 12 }}>
          <Link href="/products" className="btn primary">Shop all</Link>
          <Link href="/products?newArrivals=true" className="btn">New arrivals</Link>
        </div>
      </section>
      <h2 className="sec-title">Trending now</h2>
      <div className="grid">{items.map((p, i) => <ProductCard key={p._id} p={p} i={i} />)}</div>
    </div>
  );
}
