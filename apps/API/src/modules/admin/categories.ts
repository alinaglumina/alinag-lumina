import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { Category } from "../../models/Category.js";
import { uniqueSlug } from "../../lib/slug.js";
import { audit } from "../../utils/audit.js";

const r = Router();
const fields = {
  name: z.string().min(2),
  parent: z.string().nullable().optional(),
  image: z.string().optional(), icon: z.string().optional(),
  order: z.number().optional(),
  seo: z.object({ title: z.string().optional(), description: z.string().optional(), keywords: z.array(z.string()).optional() }).optional(),
  status: z.enum(["active", "hidden"]).optional(),
};

// LIST — flat, or ?tree=true for a nested category tree.
r.get("/", asyncHandler(async (req, res) => {
  const all = await Category.find().sort("order name").lean();
  if (req.query.tree === "true") {
    const byId: any = {}; all.forEach((c: any) => (byId[c._id] = { ...c, children: [] }));
    const roots: any[] = [];
    all.forEach((c: any) => (c.parent ? byId[c.parent]?.children.push(byId[c._id]) : roots.push(byId[c._id])));
    return res.json({ tree: roots });
  }
  res.json({ items: all });
}));

r.get("/:id", asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).lean();
  if (!category) throw notFound("Category not found");
  res.json({ category });
}));

r.post("/", validate(z.object(fields)), asyncHandler(async (req, res) => {
  const slug = await uniqueSlug(Category, req.body.name);
  const category = await Category.create({ ...req.body, slug });
  await audit(req, "category.create", "Category", String(category._id), null, category.toObject());
  res.status(201).json({ category });
}));

r.put("/:id", validate(z.object({ ...fields, name: fields.name.optional() })), asyncHandler(async (req, res) => {
  const before = await Category.findById(req.params.id).lean();
  if (!before) throw notFound("Category not found");
  const patch: any = { ...req.body };
  if (req.body.name && req.body.name !== before.name) patch.slug = await uniqueSlug(Category, req.body.name, req.params.id);
  const category = await Category.findByIdAndUpdate(req.params.id, patch, { new: true });
  await audit(req, "category.update", "Category", req.params.id, before, category!.toObject());
  res.json({ category });
}));

r.delete("/:id", asyncHandler(async (req, res) => {
  const before = await Category.findById(req.params.id).lean();
  if (!before) throw notFound("Category not found");
  const childCount = await Category.countDocuments({ parent: req.params.id });
  if (childCount > 0) return res.status(400).json({ error: "has_children", message: "Reassign or delete subcategories first" });
  await Category.findByIdAndDelete(req.params.id);
  await audit(req, "category.delete", "Category", req.params.id, before, null);
  res.json({ ok: true });
}));

export const adminCategoryRoutes = r;
