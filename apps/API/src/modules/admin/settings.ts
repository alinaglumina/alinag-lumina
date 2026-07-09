import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { Setting } from "../../models/Setting.js";
import { audit } from "../../utils/audit.js";

const r = Router();

// All settings (optionally by group).
r.get("/", asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.group) filter.group = req.query.group;
  res.json({ items: await Setting.find(filter).sort("group key").lean() });
}));

r.get("/:key", asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ key: req.params.key }).lean();
  if (!setting) throw notFound("Setting not found");
  res.json({ setting });
}));

// Upsert by key.
r.put("/:key", validate(z.object({
  value: z.any(), group: z.string().optional(), isPublic: z.boolean().optional(), description: z.string().optional(),
})), asyncHandler(async (req, res) => {
  const before = await Setting.findOne({ key: req.params.key }).lean();
  const setting = await Setting.findOneAndUpdate({ key: req.params.key }, { ...req.body, key: req.params.key }, { new: true, upsert: true });
  await audit(req, before ? "settings.update" : "settings.create", "Setting", req.params.key, before, setting!.toObject());
  res.json({ setting });
}));

r.delete("/:key", asyncHandler(async (req, res) => {
  const before = await Setting.findOne({ key: req.params.key }).lean();
  if (!before) throw notFound("Setting not found");
  await Setting.deleteOne({ key: req.params.key });
  await audit(req, "settings.delete", "Setting", req.params.key, before, null);
  res.json({ ok: true });
}));

export const adminSettingRoutes = r;
