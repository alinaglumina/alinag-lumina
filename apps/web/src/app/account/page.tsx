"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { client } from "@/lib/client";

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
type Tab = "orders" | "wishlist" | "addresses" | "profile";

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [data, setData] = useState<any>({});

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    const map: Record<Tab, string> = { orders: "/me/orders", wishlist: "/wishlist", addresses: "/me/addresses", profile: "/me" };
    client.get(map[tab]).then((d) => setData(d)).catch(() => setData({}));
  }, [tab, user]);

  if (loading || !user) return <div className="wrap" style={{ margin: "40px auto" }}>Loading…</div>;
  const tabs: Tab[] = ["orders", "wishlist", "addresses", "profile"];

  return (
    <div className="wrap" style={{ margin: "30px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="sec-title">Hi, {user.name.split(" ")[0]}</h1>
        <button className="btn" onClick={() => { logout(); router.push("/"); }}>Log out</button>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "16px 0 22px", flexWrap: "wrap" }}>
        {tabs.map((t) => <button key={t} className={`btn ${t === tab ? "primary" : ""}`} onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>{t}</button>)}
      </div>

      {tab === "orders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(data.items ?? []).length === 0 && <p style={{ color: "var(--ink-soft)" }}>No orders yet.</p>}
          {(data.items ?? []).map((o: any) => (
            <div key={o._id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b className="mono">{o.orderNo}</b><span>{inr(o.amounts?.total ?? 0)}</span>
              </div>
              <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 6 }}>Status: {o.status} · Payment: {o.payment?.status} · {new Date(o.createdAt).toLocaleDateString("en-IN")}</div>
            </div>
          ))}
        </div>
      )}
      {tab === "wishlist" && (
        <div className="grid">
          {(data.products ?? []).length === 0 && <p style={{ color: "var(--ink-soft)" }}>Your wishlist is empty.</p>}
          {(data.products ?? []).map((p: any) => (
            <a key={p._id} href={`/product/${p.slug}`} className="card"><div className="thumb" style={{ background: "linear-gradient(135deg,#7c5cff,#b49bff)" }}>🛍️</div><div className="body"><div className="nm">{p.name}</div><div className="price"><span className="now">{inr(p.price)}</span></div></div></a>
          ))}
        </div>
      )}
      {tab === "addresses" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(data.addresses ?? []).length === 0 && <p style={{ color: "var(--ink-soft)" }}>No saved addresses.</p>}
          {(data.addresses ?? []).map((a: any) => (
            <div key={a._id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
              <b>{a.name}</b> {a.isDefault && <span style={{ fontSize: 11, color: "var(--gold)" }}>· Default</span>}
              <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{[a.line1, a.city, a.state, a.pincode].filter(Boolean).join(", ")}</div>
            </div>
          ))}
        </div>
      )}
      {tab === "profile" && data.user && (
        <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, maxWidth: 420 }}>
          <div><b>Name:</b> {data.user.name}</div>
          <div style={{ marginTop: 8 }}><b>Email:</b> {data.user.email} {data.user.emailVerified ? "✓" : "· unverified"}</div>
          <div style={{ marginTop: 8 }}><b>Phone:</b> {data.user.phone ?? "—"}</div>
        </div>
      )}
    </div>
  );
}
