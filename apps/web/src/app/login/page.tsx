"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        router.push("/account");
      } else {
        const message = await register(form.name, form.email, form.password);
        setNotice(message || "Account created successfully! Please check your email to verify your account, then sign in.");
        setMode("login");
        setForm({ name: "", email: form.email, password: "" });   // keep email prefilled, clear password
      }
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const field = (k: keyof typeof form, label: string, type = "text") => (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{label}</span>
      <input type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        style={{ width: "100%", height: 42, marginTop: 6, borderRadius: 10, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", padding: "0 12px" }} />
    </label>
  );
  return (
    <div className="wrap" style={{ maxWidth: 420, margin: "48px auto" }}>
      <h1 className="sec-title" style={{ fontSize: 26 }}>{mode === "login" ? "Sign in" : "Create account"}</h1>
      <div style={{ marginTop: 18 }}>
        {notice && <div style={{ color: "#6ee7a0", fontSize: 13, margin: "0 0 14px", padding: "10px 12px", borderRadius: 8, background: "rgba(110,231,160,0.1)", border: "1px solid rgba(110,231,160,0.3)" }}>{notice}</div>}
        {mode === "register" && field("name", "Name")}
        {field("email", "Email", "email")}
        {field("password", "Password", "password")}
        {err && <div style={{ color: "#ff6b6b", fontSize: 13, margin: "8px 0" }}>{err}</div>}
        <button className="btn primary" style={{ width: "100%", height: 44, marginTop: 8 }} onClick={submit} disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <div style={{ marginTop: 14, fontSize: 13, color: "var(--ink-soft)" }}>
          {mode === "login" ? "New here? " : "Have an account? "}
          <a style={{ color: "var(--brand-2)", cursor: "pointer" }} onClick={() => { setMode(mode === "login" ? "register" : "login"); setNotice(""); setErr(""); }}>
            {mode === "login" ? "Create one" : "Sign in"}
          </a>
        </div>
      </div>
    </div>
  );
}
