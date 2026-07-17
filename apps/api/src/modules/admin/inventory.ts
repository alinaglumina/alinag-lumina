import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound, badRequest } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { Product } from "../../models/Product.js";
import { audit } from "../../utils/audit.js";
import { invalidateTag } from "../../lib/cache.js";

const r = Router();

// Stock overview — optionally only low-stock items.
r.get("/", validate(z.object({ lowStock: z.coerce.boolean().optional(), q: z.string().optional(),
  page: z.coerce.number().default(1), limit: z.coerce.number().default(30) }), "query"),
  asyncHandler(async (req, res) => {
    const { lowStock, q, page, limit } = req.query as any;
    const filter: any = {};
    if (lowStock) filter.$expr = { $lte: ["$stock", "$lowStockThreshold"] };
    if (q) filter.$or = [{ name: new RegExp(q, "i") }, { sku: new RegExp(q, "i") }];
    const [items, total] = await Promise.all([
      Product.find(filter).select("name sku stock lowStockThreshold variants.sku variants.stock").sort("stock").skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  }));

// Adjust product stock: absolute (set) or relative (delta), with a reason for the audit trail.
r.patch("/:productId", validate(z.object({ set: z.number().int().optional(), delta: z.number().int().optional(), reason: z.string().max(200).optional() })),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);
    if (!product) throw notFound("Product not found");
    const before = product.stock ?? 0;
    if (req.body.set == null && req.body.delta == null) throw badRequest("Provide 'set' or 'delta'");
    const next = req.body.set != null ? req.body.set : before + req.body.delta!;
    if (next < 0) throw badRequest("Stock cannot go negative");
    product.stock = next; await product.save();
    await invalidateTag("products");
    await audit(req, "inventory.adjust", "Product", req.params.productId, { stock: before }, { stock: next, reason: req.body.reason });
    res.json({ productId: product._id, stock: next });
  }));

// Adjust a specific variant's stock by SKU.
r.patch("/:productId/variant/:sku", validate(z.object({ set: z.number().int().optional(), delta: z.number().int().optional() })),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);
    if (!product) throw notFound("Product not found");
    const variant = (product.variants as any[]).find((v) => v.sku === req.params.sku);
    if (!variant) throw notFound("Variant not found");
    const before = variant.stock ?? 0;
    const next = req.body.set != null ? req.body.set : before + (req.body.delta ?? 0);
    if (next < 0) throw badRequest("Stock cannot go negative");
    variant.stock = next; await product.save();
    await invalidateTag("products");
    await audit(req, "inventory.variant.adjust", "Product", req.params.productId, { sku: req.params.sku, stock: before }, { sku: req.params.sku, stock: next });
    res.json({ productId: product._id, sku: req.params.sku, stock: next });
  }));

export const adminInventoryRoutes = r;
