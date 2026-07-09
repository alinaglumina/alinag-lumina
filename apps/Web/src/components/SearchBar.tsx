"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { autocomplete, type Product } from "@/services/product.service";

const HISTORY_KEY = "lumina_search_history";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sugs, setSugs] = useState<Product[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const debounced = useDebounce(q, 200);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")); } catch {} }, []);
  useEffect(() => {
    let alive = true;
    if (debounced.trim().length >= 2) autocomplete(debounced).then((r) => alive && setSugs(r.suggestions)).catch(() => {});
    else setSugs([]);
    return () => { alive = false; };
  }, [debounced]);

  const submit = (term: string) => {
    if (!term.trim()) return;
    const next = [term, ...history.filter((h) => h !== term)].slice(0, 6);
    setHistory(next); try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(term)}`);
  };

  // Voice search (optional) — Web Speech API where available.
  const voice = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    const rec = new SR(); rec.lang = "en-IN";
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; setQ(t); submit(t); };
    rec.start();
  };

  return (
    <div ref={box} style={{ position: "relative", flex: 1, maxWidth: 440 }}>
      <input
        value={q} onFocus={() => setOpen(true)} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit(q)}
        placeholder="Search products, brands and more…"
        style={{ width: "100%", height: 40, borderRadius: 11, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", padding: "0 42px 0 14px", fontSize: 14 }}
      />
      <button onClick={voice} aria-label="Voice search" style={{ position: "absolute", right: 6, top: 5, height: 30, width: 30, borderRadius: 8, border: "none", background: "transparent", color: "var(--ink-soft)", cursor: "pointer" }}>🎤</button>
      {open && (sugs.length > 0 || history.length > 0) && (
        <div style={{ position: "absolute", top: 46, left: 0, right: 0, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 8, zIndex: 60 }}>
          {sugs.map((s) => (
            <div key={s._id} onMouseDown={() => submit(s.name)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>{s.name}</div>
          ))}
          {sugs.length === 0 && history.map((h) => (
            <div key={h} onMouseDown={() => submit(h)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "var(--ink-soft)" }}>🕘 {h}</div>
          ))}
        </div>
      )}
    </div>
  );
}
