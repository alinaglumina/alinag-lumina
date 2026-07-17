import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { beforeAll, afterEach, afterAll } from "vitest";

// If MONGO_TEST_URI is set (e.g. a disposable Atlas db or local mongod), use it and skip
// the in-memory binary download. Otherwise spin up an ephemeral MongoMemoryServer.
export function setupTestDB() {
  let mem: MongoMemoryServer | null = null;
  beforeAll(async () => {
    const uri = process.env.MONGO_TEST_URI;
    if (uri) { await mongoose.connect(uri); }
    else { mem = await MongoMemoryServer.create(); await mongoose.connect(mem.getUri()); }
  });
  afterEach(async () => { for (const k of Object.keys(mongoose.connection.collections)) await mongoose.connection.collections[k].deleteMany({}); });
  afterAll(async () => { await mongoose.disconnect(); if (mem) await mem.stop(); });
}
