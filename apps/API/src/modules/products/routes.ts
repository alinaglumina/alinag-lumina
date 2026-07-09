import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { listProducts, getBySlug, autocomplete } from "./service.js";

const r = Router();

const listSchema = z.object({
  q: z.string().optional(), category: z.string().optional(), brand: z.string().optional(),
  minPrice: z.coerce.number().optional(), maxPrice: z.coerce.number().optional(),
  rating: z.coerce.number().optional(), color: z.string().optional(), size: z.string().optional(),
  inStock: z.coerce.boolean().optional(), discount: z.coerce.number().optional(),
  newArrivals: z.coerce.boolean().optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "rating", "newest"]).optional(),
  page: z.coerce.number().optional(), limit: z.coerce.number().optional(),
});

r.get("/products", validate(listSchema, "query"), asyncHandler(async (req, res) => {
  res.json(await listProducts(req.query as any));
}));

r.get("/products/autocomplete", asyncHandler(async (req, res) => {
  res.json({ suggestions: await autocomplete(String(req.query.q ?? "")) });
}));

r.get("/products/:slug", asyncHandler(async (req, res) => {
  const product = await getBySlug(req.params.slug);
  if (!product) throw notFound("Product not found");
  res.json({ product });
}));

export const productRoutes = r;
