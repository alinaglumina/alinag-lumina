import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { Product } from "../../models/Product.js";
import { uniqueSlug } from "../../lib/slug.js";
import { audit } from "../../utils/audit.js";
import { invalidateTag } from "../../lib/cache.js";

const r = Router();

// Shared field schema (create requires name+price; update makes all optional).
const base = {
  name: z.string().min(2),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  price: z.number().nonnegative(),
  mrp: z.number().nonnegative().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  gstPercent: z.number().min(0).max(28).optional(),
  hsnCode: z.string().optional(),
  variants: z.array(z.object({
    sku: z.string(), barcode: z.string().optional(),
    attributes: z.record(z.string()).optional(),
    price: z.number().optional(), mrp: z.number().optional(), stock: z.number().optional(),
    images: z.array(z.string()).optional(),
  })).optional(),
  stock: z.number().optional(),
  lowStockThreshold: z.number().optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isNewArrival: z.boolean().optional(),
  featured: z.boolean().optional(),
  related: z.array(z.string()).optional(),
  seo: z.object({ title: z.string().optional(), description: z.string().optional(), keywords: z.array(z.string()).optional() }).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
};
const createSchema = z.object(base);
const updateSchema = z.object({ ...base, name: base.name.optional(), price: base.price.optional() });

// LIST — search + filter + paginate (admin sees all statuses).
r.get("/", validate(z.object({
  q: z.string().optional(), status: z.string().optional(), brand: z.string().optional(),
  category: z.string().optional(), lowStock: z.coerce.boolean().optional(),
  page: z.coerce.number().default(1), limit: z.coerce.number().default(20),
  sort: z.string().default("-createdAt"),
}), "query"), asyncHandler(async (req, res) => {
  const { q, status, brand, category, lowStock, page, limit, sort } = req.query as any;
  const filter: any = {};
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { sku: new RegExp(q, "i") }];
  if (status) filter.status = status;
  if (brand) filter.brand = brand;
  if (category) filter.category = category;
  if (lowStock) filter.$expr = { $lte: ["$stock", "$lowStockThreshold"] };
  const [items, total] = await Promise.all([
    Product.find(filter).populate("brand", "name").populate("category", "name")
      .sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

// GET one
r.get("/:id", asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) throw notFound("Product not found");
  res.json({ product });
}));

// CREATE
r.post("/", validate(createSchema), asyncHandler(async (req, res) => {
  const slug = await uniqueSlug(Product, req.body.name);
  const product = await Product.create({ ...req.body, slug });
  await invalidateTag("products");
  await audit(req, "product.create", "Product", String(product._id), null, product.toObject());
  res.status(201).json({ product });
}));

// UPDATE
r.put("/:id", validate(updateSchema), asyncHandler(async (req, res) => {
  const before = await Product.findById(req.params.id).lean();
  if (!before) throw notFound("Product not found");
  const patch: any = { ...req.body };
  if (req.body.name && req.body.name !== before.name) patch.slug = await uniqueSlug(Product, req.body.name, req.params.id);
  const product = await Product.findByIdAndUpdate(req.params.id, patch, { new: true });
  await invalidateTag("products");
  await audit(req, "product.update", "Product", req.params.id, before, product!.toObject());
  res.json({ product });
}));

// DELETE (soft — archive; use ?hard=true to remove)
r.delete("/:id", asyncHandler(async (req, res) => {
  const before = await Product.findById(req.params.id).lean();
  if (!before) throw notFound("Product not found");
  if ((req.query.hard as string) === "true") await Product.findByIdAndDelete(req.params.id);
  else await Product.findByIdAndUpdate(req.params.id, { status: "archived" });
  await invalidateTag("products");
  await audit(req, "product.delete", "Product", req.params.id, before, { hard: req.query.hard === "true" });
  res.json({ ok: true });
}));

export const adminProductRoutes = r;
