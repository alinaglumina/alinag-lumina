import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { Blog } from "../../models/Content.js";
import { uniqueSlug } from "../../lib/slug.js";
import { audit } from "../../utils/audit.js";

const r = Router();
const fields = {
  title: z.string().min(2),
  cover: z.string().optional(), excerpt: z.string().optional(), body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  seo: z.object({ title: z.string().optional(), description: z.string().optional(), keywords: z.array(z.string()).optional() }).optional(),
  status: z.enum(["draft", "published"]).optional(),
};

r.get("/", validate(z.object({ status: z.string().optional(), q: z.string().optional() }), "query"),
  asyncHandler(async (req, res) => {
    const { status, q } = req.query as any;
    const filter: any = {};
    if (status) filter.status = status;
    if (q) filter.title = new RegExp(q, "i");
    res.json({ items: await Blog.find(filter).sort("-createdAt").lean() });
  }));
r.get("/:id", asyncHandler(async (req, res) => {
  const post = await Blog.findById(req.params.id).lean();
  if (!post) throw notFound("Post not found");
  res.json({ post });
}));
r.post("/", validate(z.object(fields)), asyncHandler(async (req, res) => {
  const slug = await uniqueSlug(Blog, req.body.title);
  const post = await Blog.create({ ...req.body, slug, author: req.user!.sub, publishedAt: req.body.status === "published" ? new Date() : undefined });
  await audit(req, "blog.create", "Blog", String(post._id), null, post.toObject());
  res.status(201).json({ post });
}));
r.put("/:id", validate(z.object({ ...fields, title: fields.title.optional() })), asyncHandler(async (req, res) => {
  const before = await Blog.findById(req.params.id).lean();
  if (!before) throw notFound("Post not found");
  const patch: any = { ...req.body };
  if (req.body.title && req.body.title !== before.title) patch.slug = await uniqueSlug(Blog, req.body.title, req.params.id);
  if (req.body.status === "published" && before.status !== "published") patch.publishedAt = new Date();
  const post = await Blog.findByIdAndUpdate(req.params.id, patch, { new: true });
  await audit(req, "blog.update", "Blog", req.params.id, before, post!.toObject());
  res.json({ post });
}));
r.delete("/:id", asyncHandler(async (req, res) => {
  const before = await Blog.findById(req.params.id).lean();
  if (!before) throw notFound("Post not found");
  await Blog.findByIdAndDelete(req.params.id);
  await audit(req, "blog.delete", "Blog", req.params.id, before, null);
  res.json({ ok: true });
}));
export const adminBlogRoutes = r;
