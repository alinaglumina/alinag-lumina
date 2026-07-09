import IORedis from "ioredis";
import { env } from "../config/env.js";

// Response cache for hot reads. Uses Redis when REDIS_URL is set; otherwise an in-memory
// Map with TTL (single-node/dev). Tag-based invalidation lets writes bust related keys.
const redis = env.REDIS_URL ? new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }) : null;
const mem = new Map<string, { v: string; exp: number }>();
const memTags = new Map<string, Set<string>>();

async function get(key: string): Promise<string | null> {
  if (redis) return redis.get(key);
  const e = mem.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) { mem.delete(key); return null; }
  return e.v;
}
async function set(key: string, val: string, ttlSec: number, tags: string[]) {
  if (redis) {
    await redis.set(key, val, "EX", ttlSec);
    for (const t of tags) { await redis.sadd(`tag:${t}`, key); await redis.expire(`tag:${t}`, ttlSec * 2); }
  } else {
    mem.set(key, { v: val, exp: Date.now() + ttlSec * 1000 });
    for (const t of tags) { if (!memTags.has(t)) memTags.set(t, new Set()); memTags.get(t)!.add(key); }
  }
}

// Cache-aside: return the cached value or compute, store, and return it.
export async function cacheWrap<T>(key: string, ttlSec: number, tags: string[], fn: () => Promise<T>): Promise<T> {
  const hit = await get(key);
  if (hit !== null) return JSON.parse(hit) as T;
  const val = await fn();
  try { await set(key, JSON.stringify(val), ttlSec, tags); } catch { /* cache failures never break the request */ }
  return val;
}

export async function invalidateTag(tag: string) {
  if (redis) {
    const keys = await redis.smembers(`tag:${tag}`);
    if (keys.length) await redis.del(...keys);
    await redis.del(`tag:${tag}`);
  } else {
    const keys = memTags.get(tag);
    if (keys) { for (const k of keys) mem.delete(k); memTags.delete(tag); }
  }
}
export const cacheEnabled = () => Boolean(redis);
