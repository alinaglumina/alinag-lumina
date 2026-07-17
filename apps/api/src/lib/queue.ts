import { Queue as BullQueue, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// Background job processing. With REDIS_URL set, jobs run on BullMQ workers (retries +
// exponential backoff, survives restarts). Without Redis, jobs run INLINE (same interface),
// so dev/test and single-node setups work with zero extra infra.
const connection = env.REDIS_URL ? new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }) : null;
const workers: Worker[] = [];

export interface JobQueue<T> { add(data: T): Promise<void>; }

export function createQueue<T>(name: string, processor: (data: T) => Promise<void>): JobQueue<T> {
  if (connection) {
    const queue = new BullQueue(name, { connection: connection as any });
    const worker = new Worker(name, async (job) => { await processor(job.data as T); }, { connection: connection as any });
    worker.on("failed", (job, err) => logger.error({ queue: name, jobId: job?.id, err }, "job failed"));
    workers.push(worker);
    logger.info({ queue: name }, "background queue ready (redis)");
    return { add: async (data) => { await queue.add(name, data as any, { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 }); } };
  }
  // Inline fallback — process immediately, never lose the job to a missing broker.
  return { add: async (data) => { try { await processor(data); } catch (e) { logger.error({ e, queue: name }, "inline job failed"); } } };
}

export const usingRedis = () => Boolean(connection);
export async function queueReady(): Promise<boolean> {
  if (!connection) return true;
  try { return (await connection.ping()) === "PONG"; } catch { return false; }
}
export async function closeQueues() { for (const w of workers) await w.close(); if (connection) await connection.quit(); }
