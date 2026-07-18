"use client";
// Client-side API calls: attaches the bearer token, or a guest session id for cart/wishlist.
const BASE = process.env.NEXT_PUBLIC_API_BASE;
if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE is not defined");

export const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("lumina_token") : null);

// Also mirror the token into a cookie so middleware.ts (server-side) can see it —
// localStorage is invisible to middleware, which only has access to cookies.
export const setToken = (t: string) => {
  localStorage.setItem("lumina_token", t);
  document.cookie = `access_token=${t}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
};
export const clearToken = () => {
  localStorage.removeItem("lumina_token");
  document.cookie = "access_token=; path=/; max-age=0";
};

export function sessionId() {
  let s = localStorage.getItem("lumina_sid");
  if (!s) { s = "guest_" + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)); localStorage.setItem("lumina_sid", s); }
  return s;
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) headers.authorization = "Bearer " + t;
  else if (typeof window !== "undefined") headers["x-session-id"] = sessionId();
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).message || (data as any).error || res.statusText);
  return data as T;
}
export const client = {
  get: <T>(p: string) => req<T>("GET", p),
  post: <T>(p: string, b?: unknown) => req<T>("POST", p, b),
  put: <T>(p: string, b?: unknown) => req<T>("PUT", p, b),
  patch: <T>(p: string, b?: unknown) => req<T>("PATCH", p, b),
  del: <T>(p: string) => req<T>("DELETE", p),
};
