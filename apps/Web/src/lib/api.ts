// Server-side fetch wrapper to the Express API. Uses Next's fetch cache/revalidate.
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

export async function apiGet<T>(path: string, opts?: { revalidate?: number; tags?: string[] }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate: opts?.revalidate ?? 60, tags: opts?.tags },
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}
export const API_BASE = BASE;
