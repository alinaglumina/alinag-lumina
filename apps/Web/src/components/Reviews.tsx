"use client";
import { useState } from "react";
import Link from "next/link";
import { client } from "@/lib/client";
import { useAuth } from "@/hooks/useAuth";
import type { Review, ReviewList } from "@/services/review.service";

const Stars = ({ n }: { n: number }) => <span style={{ color: "var(--gold)" }}>{"★".repeat(n)}<span style={{ color: "var(--line)" }}>{"★".repeat(5 - n)}</span></span>;

export default function Reviews({ productId, initial }: { productId: string; initial: ReviewList }) {
  const { user } = useAuth();
  const [reviews] = useState<Review[]>(initial.reviews ?? []);
  const [rating, setRating] = useState(5);
  const [form, setForm] = useState({ title: "", body: "" });
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setMsg("");
    try {
      await client.post("/reviews", { product: productId, rating, title: form.title, body: form.body });
      setMsg("Thanks! Your review was submitted for moderation.");
      setForm({ title: "", body: "" });
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  };

  return (
    <section style={{ marginTop: 40 }}>
      <h2 className="sec-title" style={{ fontSize: 22 }}>Ratings & Reviews {initial.count ? `· ${initial.average}★ (${initial.count})` : ""}</h2>

      {user ? (
        <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, margin: "14px 0" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => <span key={n} onClick={() => setRating(n)} style={{ cursor: "pointer", fontSize: 22, color: n <= rating ? "var(--gold)" : "var(--line)" }}>★</span>)}
          </div>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            style={{ width: "100%", height: 40, borderRadius: 10, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", padding: "0 12px", marginBottom: 10 }} />
          <textarea placeholder="Share your experience" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
            style={{ width: "100%", minHeight: 80, borderRadius: 10, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", padding: 12 }} />
          <button className="btn primary" style={{ marginTop: 10 }} onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit review"}</button>
          {msg && <div style={{ marginTop: 8, fontSize: 13, color: "var(--ink-soft)" }}>{msg}</div>}
        </div>
      ) : (
        <p style={{ color: "var(--ink-soft)", margin: "12px 0" }}><Link href="/login" style={{ color: "var(--brand-2)" }}>Sign in</Link> to write a review.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {reviews.length === 0 && <p style={{ color: "var(--ink-soft)" }}>No reviews yet — be the first!</p>}
        {reviews.map((r) => (
          <div key={r._id} style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Stars n={r.rating} />
              <b style={{ fontSize: 14 }}>{r.title}</b>
              {r.verifiedPurchase && <span style={{ fontSize: 11, color: "#2fbf71" }}>✓ Verified purchase</span>}
            </div>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 6 }}>{r.body}</p>
            <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>— {r.user?.name ?? "Customer"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
