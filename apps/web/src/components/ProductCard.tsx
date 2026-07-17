import Link from "next/link";
import type { Product } from "@/services/product.service";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const GRADS = ["linear-gradient(135deg,#7c5cff,#b49bff)", "linear-gradient(135deg,#2f6bff,#5bd0ff)", "linear-gradient(135deg,#f5a623,#ffd479)", "linear-gradient(135deg,#ff6b9d,#ffb46b)"];

export default function ProductCard({ p, i = 0 }: { p: Product; i?: number }) {
  return (
    <Link href={`/product/${p.slug}`} className="card">
      <div className="thumb" style={{ background: GRADS[i % GRADS.length] }}>{p.glyph ?? "🛍️"}</div>
      <div className="body">
        <div className="nm">{p.name}</div>
        <div className="price">
          <span className="now">{inr(p.price)}</span>
          {p.mrp && p.mrp > p.price ? <span className="was">{inr(p.mrp)}</span> : null}
        </div>
      </div>
    </Link>
  );
}
