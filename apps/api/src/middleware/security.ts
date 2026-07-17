import type { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import xss from "xss";
import { env } from "../config/env.js";

// Recursively strip XSS payloads from string inputs.
function deepClean(obj: any): any {
  if (typeof obj === "string") return xss(obj);
  if (Array.isArray(obj)) return obj.map(deepClean);
  if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) obj[k] = deepClean(obj[k]);
  }
  return obj;
}
const xssClean = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = deepClean(req.body);
  next();
};

export const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30, standardHeaders: true, legacyHeaders: false });
export const apiLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });

export function applySecurity(app: Express) {
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: [env.WEB_ORIGIN], credentials: true }));
  app.use(compression());
  app.use(hpp());
  app.use(mongoSanitize());
  app.use(xssClean);
  app.use(apiLimiter);
}
