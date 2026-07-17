import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import swaggerUi from "swagger-ui-express";
import pinoHttp from "pino-http";
import mongoose from "mongoose";
import { logger } from "./lib/logger.js";
import { queueReady, usingRedis } from "./lib/queue.js";
import { openapiSpec } from "./docs/openapi.js";
import { applySecurity } from "./middleware/security.js";
import { notFoundHandler, errorHandler } from "./middleware/error.js";
import { authRoutes } from "./modules/auth/routes.js";
import { productRoutes } from "./modules/products/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { paymentRoutes } from "./modules/payments/routes.js";
import { couponRoutes } from "./modules/coupons/routes.js";
import { checkoutRoutes } from "./modules/checkout/routes.js";
import { cartRoutes } from "./modules/cart/routes.js";
import { wishlistRoutes } from "./modules/wishlist/routes.js";
import { reviewRoutes } from "./modules/reviews/routes.js";
import { contentRoutes } from "./modules/content/routes.js";
import { publicSettingsRoutes } from "./modules/content/settings-public.js";
import { accountRoutes } from "./modules/account/routes.js";
import { notificationRoutes } from "./modules/notifications/routes.js";
import { logisticsRoutes } from "./modules/logistics/routes.js";

export function buildApp() {
  const app = express();
  app.set("trust proxy", 1);   // correct client IPs behind Nginx/proxy (rate-limit, audit)
  app.use(pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = (req.headers["x-request-id"] as string) || crypto.randomUUID();
      res.setHeader("x-request-id", id);
      return id;
    },
  }));
  app.use(express.json({ limit: "1mb", verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));
  app.use(cookieParser());
  applySecurity(app);                 // helmet, cors, compression, hpp, sanitize, xss, rate-limit

  // Liveness — is the process up?
  app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
  // Readiness — are dependencies (DB, job broker) reachable? Used by load balancers/k8s.
  app.get("/ready", async (_req, res) => {
    const db = mongoose.connection.readyState === 1;
    const jobs = await queueReady();
    res.status(db && jobs ? 200 : 503).json({ db, jobs, redis: usingRedis(), uptime: process.uptime() });
  });
  // API docs
  app.get("/openapi.json", (_req, res) => res.json(openapiSpec));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec as any, { customSiteTitle: "Alinag Lumina API" }));

  app.use("/auth", authRoutes);
  app.use("/", productRoutes);
  app.use("/", paymentRoutes);
  app.use("/", couponRoutes);
  app.use("/", checkoutRoutes);
  app.use("/", cartRoutes);
  app.use("/", wishlistRoutes);
  app.use("/", reviewRoutes);
  app.use("/", contentRoutes);
  app.use("/", publicSettingsRoutes);
  app.use("/", accountRoutes);
  app.use("/", notificationRoutes);
  app.use("/", logisticsRoutes);
  app.use("/admin", adminRoutes);
  // TODO: /cart, /wishlist, /orders, /payments (port the Razorpay module), /reviews,
  //       /coupons, /cms, /notifications, /search history, /track — see README roadmap.

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
