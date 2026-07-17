import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { AuditLog } from "../../models/AuditLog.js";

const r = Router();

// Read-only audit viewer — filter by actor, action, entity, and date range.
r.get("/", validate(z.object({
  actor: z.string().optional(), action: z.string().optional(), entity: z.string().optional(),
  from: z.coerce.date().optional(), to: z.coerce.date().optional(),
  page: z.coerce.number().default(1), limit: z.coerce.number().default(50),
}), "query"), asyncHandler(async (req, res) => {
  const { actor, action, entity, from, to, page, limit } = req.query as any;
  const filter: any = {};
  if (actor) filter.actor = actor;
  if (action) filter.action = new RegExp(action, "i");
  if (entity) filter.entity = entity;
  if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  const [items, total] = await Promise.all([
    AuditLog.find(filter).populate("actor", "name email role").sort("-createdAt").skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

export const adminAuditRoutes = r;
