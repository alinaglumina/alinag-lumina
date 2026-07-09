import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { CmsPage } from "../../models/Content.js";
import { audit } from "../../utils/audit.js";

const r = Router();
const fields = {
  key: z.string().min(2),
  title: z.string().optional(),
  type: z.enum(["page", "section", "menu", "faq"]).optional(),
  content: z.any().optional(),            // flexible blocks / html / JSON
  seo: z.object({ title: z.string().optional(), description: z.string().optional(), keywords: z.array(z.string()).optional() }).optional(),
  status: z.enum(["draft", "published"]).optional(),
};

r.get("/", asyncHandler(async (_req, res) => res.json({ items: await CmsPage.find().sort("key").lean() })));
r.get("/:key", asyncHandler(async (req, res) => {
  const page = await CmsPage.findOne({ key: req.params.key }).lean();
  if (!page) throw notFound("Page not found");
  res.json({ page });
}));

// Upsert by key — create or update the page in one call (ideal for the editor).
r.put("/:key", validate(z.object({ ...fields, key: fields.key.optional() })), asyncHandler(async (req, res) => {
  const before = await CmsPage.findOne({ key: req.params.key }).lean();
  const page = await CmsPage.findOneAndUpdate({ key: req.params.key }, { ...req.body, key: req.params.key }, { new: true, upsert: true });
  await audit(req, before ? "cms.update" : "cms.create", "CmsPage", req.params.key, before, page!.toObject());
  res.json({ page });
}));

r.delete("/:key", asyncHandler(async (req, res) => {
  const before = await CmsPage.findOne({ key: req.params.key }).lean();
  if (!before) throw notFound("Page not found");
  await CmsPage.deleteOne({ key: req.params.key });
  await audit(req, "cms.delete", "CmsPage", req.params.key, before, null);
  res.json({ ok: true });
}));

export const adminCmsRoutes = r;
