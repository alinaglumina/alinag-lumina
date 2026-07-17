import pino from "pino";
import { env } from "../config/env.js";
// Pretty logs in development only; JSON in test/production (and no optional-dep requirement there).
const dev = env.NODE_ENV === "development";
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (env.NODE_ENV === "test" ? "silent" : "info"),
  transport: dev ? { target: "pino-pretty", options: { colorize: true } } : undefined,
});
