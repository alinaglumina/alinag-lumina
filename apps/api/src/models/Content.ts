import { Schema, model } from "mongoose";

const BannerSchema = new Schema(
  { title: String, subtitle: String, image: String, link: String,
    placement: { type: String, enum: ["hero", "offer", "category", "footer"], default: "hero" },
    order: { type: Number, default: 0 }, active: { type: Boolean, default: true },
    startsAt: Date, endsAt: Date },
  { timestamps: true }
);
export const Banner = model("Banner", BannerSchema);

const BlogSchema = new Schema(
  { title: String, slug: { type: String, unique: true, index: true }, cover: String,
    excerpt: String, body: String, author: { type: Schema.Types.ObjectId, ref: "User" },
    tags: [String], seo: { title: String, description: String, keywords: [String] },
    status: { type: String, enum: ["draft", "published"], default: "draft" }, publishedAt: Date },
  { timestamps: true }
);
export const Blog = model("Blog", BlogSchema);

// Editable CMS pages: homepage sections, menus, footer, policy pages, FAQs.
const CmsPageSchema = new Schema(
  { key: { type: String, unique: true, index: true },   // "home", "footer", "privacy-policy", "faq"
    title: String, type: { type: String, enum: ["page", "section", "menu", "faq"], default: "page" },
    content: Schema.Types.Mixed,                          // flexible blocks/JSON
    seo: { title: String, description: String, keywords: [String] },
    status: { type: String, enum: ["draft", "published"], default: "published" } },
  { timestamps: true }
);
export const CmsPage = model("CmsPage", CmsPageSchema);
