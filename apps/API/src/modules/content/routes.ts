import { Router } from "express";
import { CmsPage } from "../../models/Content.js";
import { Banner } from "../../models/Content.js";
import { Blog } from "../../models/Content.js";
import { asyncHandler, notFound } from "../../lib/http.js";

const r = Router();

// Public CMS page/section/menu by key (published only): "home", "footer", "privacy-policy", "faq"…
r.get("/cms/:key", asyncHandler(async (req, res) => {
  const page = await CmsPage.findOne({ key: req.params.key, status: "published" }).lean();
  if (!page) throw notFound("Page not found");
  res.json({ page });
}));

// Active banners for a placement (hero/offer/category/footer), respecting the schedule window.
r.get("/banners", asyncHandler(async (req, res) => {
  const now = new Date();
  const filter: any = { active: true, $and: [
    { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
    { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
  ] };
  if (req.query.placement) filter.placement = req.query.placement;
  res.json({ banners: await Banner.find(filter).sort("order").lean() });
}));

// Published blog list + detail.
r.get("/blog", asyncHandler(async (_req, res) => {
  res.json({ posts: await Blog.find({ status: "published" }).select("title slug cover excerpt tags publishedAt").sort("-publishedAt").lean() });
}));
r.get("/blog/:slug", asyncHandler(async (req, res) => {
  const post = await Blog.findOne({ slug: req.params.slug, status: "published" }).populate("author", "name avatar").lean();
  if (!post) throw notFound("Post not found");
  res.json({ post });
}));

export const contentRoutes = r;
