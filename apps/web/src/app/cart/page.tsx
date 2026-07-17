"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { client } from "@/lib/client";

interface Line { product: string; name: string; price: number; qty: number; image?: string; inStock: boolean; lineTotal: number; }
interface Cart { items: Line[]; subtotal: number; }
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const load = () => client.get<Cart>("/cart").then(setCart).catch(() => setCart({ items: [], subtotal: 0 }));
  useEffect(() => { load(); }, []);
  const setQty = async (product: string, qty: number) => { setCart(await client.patch<Cart>("/cart/items", { productId: product, qty })); };
  const remove = async (product: string) => { setCart(await client.del<Cart>(`/cart/items/${product}`)); };

  if (!cart) return <div className="wrap" style={{ margin: "40px auto" }}>Loading cart…</div>;
  if (!cart.items.length) return <div className="wrap" style={{ margin: "40px auto" }}><h1 className="sec-title">Your cart is empty</h1></div>;
  return (
    <div className="wrap" style={{ margin: "30px auto", maxWidth: 760 }}>
      <h1 className="sec-title">Your cart</h1>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {cart.items.map((l) => (
          <div key={l.product} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center", border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
            <div><div style={{ fontWeight: 600 }}>{l.name}</div><div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{inr(l.price)}{!l.inStock && " · out of stock"}</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn" onClick={() => setQty(l.product, l.qty - 1)}>−</button>
              <span>{l.qty}</span>
              <button className="btn" onClick={() => setQty(l.product, l.qty + 1)}>+</button>
            </div>
            <div style={{ textAlign: "right" }}><div style={{ fontWeight: 700 }}>{inr(l.lineTotal)}</div><a onClick={() => remove(l.product)} style={{ fontSize: 12, color: "#ff6b6b", cursor: "pointer" }}>Remove</a></div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Subtotal: {inr(cart.subtotal)}</div>
        <Link href="/checkout" className="btn primary" style={{ height: 46, padding: "0 28px" }}>Checkout</Link>
      </div>
    </div>
  );
}
