import { Router } from "express";
import { Setting } from "../../models/Setting.js";
import { asyncHandler } from "../../lib/http.js";

const r = Router();
// Only settings explicitly flagged public are exposed to the storefront.
r.get("/settings/public", asyncHandler(async (_req, res) => {
  const rows = await Setting.find({ isPublic: true }).select("key value").lean();
  const map: Record<string, any> = {};
  rows.forEach((s: any) => (map[s.key] = s.value));
  res.json({ settings: map });
}));
export const publicSettingsRoutes = r;
