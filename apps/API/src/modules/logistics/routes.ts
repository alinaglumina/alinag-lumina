import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { Order } from "../../models/Order.js";
import { track, applyTrackingUpdate } from "./service.js";

const r = Router();

// Owner tracking.
r.get("/orders/:id/track", requireAuth, asyncHandler(async (req, res) => {
  const owns = await Order.exists({ _id: req.params.id, user: req.user!.sub });
  if (!owns) throw notFound("Order not found");
  res.json(await track(req.params.id));
}));

// Logistics provider webhook (add signature verification for your provider in prod).
r.post("/logistics/webhook", validate(z.object({ awb: z.string(), status: z.string(), note: z.string().optional() })),
  asyncHandler(async (req, res) => {
    await applyTrackingUpdate(req.body.awb, req.body.status, req.body.note);
    res.json({ ok: true });
  }));

export const logisticsRoutes = r;
