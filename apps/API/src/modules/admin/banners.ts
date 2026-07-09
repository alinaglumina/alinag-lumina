import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { Banner } from "../../models/Content.js";
import { audit } from "../../utils/audit.js";

const r = Router();
const fields = {
  title: z.string().optional(), subtitle: z.string().optional(),
  image: z.string().optional(), link: z.string().optional(),
  placement: z.enum(["hero", "offer", "category", "footer"]).optional(),
  order: z.number().optional(), active: z.boolean().optional(),
  startsAt: z.coerce.date().optional(), endsAt: z.coerce.date().optional(),
};

r.get("/", validate(z.object({ placement: z.string().optional() }), "query"), asyncHandler(async (req, res) => {
  const filter: any = {};
  if ((req.query as any).placement) filter.placement = (req.query as any).placement;
  res.json({ items: await Banner.find(filter).sort("placement order").lean() });
}));
r.get("/:id", asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id).lean();
  if (!banner) throw notFound("Banner not found");
  res.json({ banner });
}));
r.post("/", validate(z.object(fields)), asyncHandler(async (req, res) => {
  const banner = await Banner.create(req.body);
  await audit(req, "banner.create", "Banner", String(banner._id), null, banner.toObject());
  res.status(201).json({ banner });
}));
r.put("/:id", validate(z.object(fields)), asyncHandler(async (req, res) => {
  const before = await Banner.findById(req.params.id).lean();
  if (!before) throw notFound("Banner not found");
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await audit(req, "banner.update", "Banner", req.params.id, before, banner!.toObject());
  res.json({ banner });
}));
r.delete("/:id", asyncHandler(async (req, res) => {
  const before = await Banner.findById(req.params.id).lean();
  if (!before) throw notFound("Banner not found");
  await Banner.findByIdAndDelete(req.params.id);
  await audit(req, "banner.delete", "Banner", req.params.id, before, null);
  res.json({ ok: true });
}));
export const adminBannerRoutes = r;
