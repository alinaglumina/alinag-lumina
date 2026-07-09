import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { Brand } from "../../models/Brand.js";
import { uniqueSlug } from "../../lib/slug.js";
import { audit } from "../../utils/audit.js";

const r = Router();
const fields = {
  name: z.string().min(1),
  logo: z.string().optional(), description: z.string().optional(),
  seo: z.object({ title: z.string().optional(), description: z.string().optional(), keywords: z.array(z.string()).optional() }).optional(),
  status: z.enum(["active", "hidden"]).optional(),
};

r.get("/", validate(z.object({ q: z.string().optional() }), "query"), asyncHandler(async (req, res) => {
  const filter: any = {};
  if ((req.query as any).q) filter.name = new RegExp((req.query as any).q, "i");
  res.json({ items: await Brand.find(filter).sort("name").lean() });
}));

r.get("/:id", asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id).lean();
  if (!brand) throw notFound("Brand not found");
  res.json({ brand });
}));

r.post("/", validate(z.object(fields)), asyncHandler(async (req, res) => {
  const slug = await uniqueSlug(Brand, req.body.name);
  const brand = await Brand.create({ ...req.body, slug });
  await audit(req, "brand.create", "Brand", String(brand._id), null, brand.toObject());
  res.status(201).json({ brand });
}));

r.put("/:id", validate(z.object({ ...fields, name: fields.name.optional() })), asyncHandler(async (req, res) => {
  const before = await Brand.findById(req.params.id).lean();
  if (!before) throw notFound("Brand not found");
  const patch: any = { ...req.body };
  if (req.body.name && req.body.name !== before.name) patch.slug = await uniqueSlug(Brand, req.body.name, req.params.id);
  const brand = await Brand.findByIdAndUpdate(req.params.id, patch, { new: true });
  await audit(req, "brand.update", "Brand", req.params.id, before, brand!.toObject());
  res.json({ brand });
}));

r.delete("/:id", asyncHandler(async (req, res) => {
  const before = await Brand.findById(req.params.id).lean();
  if (!before) throw notFound("Brand not found");
  await Brand.findByIdAndDelete(req.params.id);
  await audit(req, "brand.delete", "Brand", req.params.id, before, null);
  res.json({ ok: true });
}));

export const adminBrandRoutes = r;
