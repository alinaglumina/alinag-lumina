// Seed the database with a starter catalog + admin. Run: npm run seed
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { logger } from "../lib/logger.js";
import { hashPassword } from "../modules/auth/service.js";
import { User } from "../models/User.js";
import { Category } from "../models/Category.js";
import { Brand } from "../models/Brand.js";
import { Product } from "../models/Product.js";
import { Coupon } from "../models/Coupon.js";
import { Banner, CmsPage } from "../models/Content.js";
import { Setting } from "../models/Setting.js";

async function seed() {
  await connectDB();
  logger.info("Seeding…");

  // Admin
  await User.updateOne(
    { email: "admin@alinaglumina.com" },
    { $setOnInsert: { name: "Lumina Admin", passwordHash: await hashPassword("admin12345"), role: "superadmin", emailVerified: true } },
    { upsert: true }
  );

  // Categories + brands
  const fashion = await Category.findOneAndUpdate({ slug: "fashion" }, { name: "Fashion", slug: "fashion" }, { upsert: true, new: true });
  const brand = await Brand.findOneAndUpdate({ slug: "aurelie" }, { name: "Aurélie", slug: "aurelie" }, { upsert: true, new: true });

  // Products
  const products = [
    { name: "Tiered Midi Dress", slug: "tiered-midi-dress", price: 1199, mrp: 3999, sku: "LUM-DR-001", stock: 25, gstPercent: 12, hsnCode: "6204", colors: ["Blush"], sizes: ["S", "M", "L"], isNewArrival: true, featured: true },
    { name: "Cloud-Runner Sneakers", slug: "cloud-runner-sneakers", price: 2499, mrp: 5999, sku: "LUM-SN-002", stock: 40, gstPercent: 18, hsnCode: "6404", sizes: ["7", "8", "9", "10"] },
    { name: "Banarasi Silk Saree", slug: "banarasi-silk-saree", price: 2899, mrp: 8499, sku: "LUM-SA-003", stock: 12, gstPercent: 5, hsnCode: "5007" },
  ];
  for (const p of products) await Product.updateOne({ slug: p.slug }, { $set: { ...p, category: fashion._id, brand: brand._id, status: "active" } }, { upsert: true });

  // Coupon
  await Coupon.updateOne({ code: "LUMINA10" }, { $setOnInsert: { code: "LUMINA10", label: "10% off", type: "percent", value: 10, cap: 500, minCartValue: 999, perUserLimit: 3, status: "active" } }, { upsert: true });

  // Banner + CMS + settings
  await Banner.updateOne({ title: "The Fashion Edit" }, { $setOnInsert: { title: "The Fashion Edit", subtitle: "Up to 80% off", placement: "hero", active: true, order: 1 } }, { upsert: true });
  await CmsPage.updateOne({ key: "privacy-policy" }, { $setOnInsert: { key: "privacy-policy", title: "Privacy Policy", type: "page", content: { html: "<p>We respect your privacy…</p>" }, status: "published" } }, { upsert: true });
  await Setting.updateOne({ key: "store.name" }, { $setOnInsert: { key: "store.name", value: "Alinag Lumina", group: "general", isPublic: true } }, { upsert: true });
  await Setting.updateOne({ key: "shipping.freeThreshold" }, { $setOnInsert: { key: "shipping.freeThreshold", value: 999, group: "shipping", isPublic: true } }, { upsert: true });

  logger.info("Seed complete → admin@alinaglumina.com / admin12345");
  await mongoose.disconnect();
}
seed().catch((e) => { logger.error({ e }, "Seed failed"); process.exit(1); });
