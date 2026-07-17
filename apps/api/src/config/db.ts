import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../lib/logger.js";

export async function connectDB() {
  mongoose.set("strictQuery", true);
  mongoose.connection.on("connected", () => logger.info("MongoDB Atlas connected"));
  mongoose.connection.on("error", (e) => logger.error({ e }, "MongoDB error"));
  await mongoose.connect(env.MONGODB_URI, { autoIndex: !env.NODE_ENV.startsWith("prod") });
  return mongoose.connection;
}
