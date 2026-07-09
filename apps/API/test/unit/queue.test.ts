import { describe, it, expect, beforeAll } from "vitest";
beforeAll(() => { process.env.MONGODB_URI = "x"; process.env.JWT_SECRET = "a".repeat(20); process.env.JWT_REFRESH_SECRET = "b".repeat(20); delete process.env.REDIS_URL; });

describe("job queue (inline fallback, no Redis)", () => {
  it("runs the processor immediately and awaits it", async () => {
    const { createQueue, usingRedis } = await import("../../src/lib/queue.js");
    expect(usingRedis()).toBe(false);
    const processed: string[] = [];
    const q = createQueue<{ id: string }>("test", async (d) => { processed.push(d.id); });
    await q.add({ id: "job-1" });
    await q.add({ id: "job-2" });
    expect(processed).toEqual(["job-1", "job-2"]);
  });
  it("swallows processor errors without throwing (inline mode)", async () => {
    const { createQueue } = await import("../../src/lib/queue.js");
    const q = createQueue<number>("boom", async () => { throw new Error("fail"); });
    await expect(q.add(1)).resolves.toBeUndefined();   // logged, not thrown
  });
});
