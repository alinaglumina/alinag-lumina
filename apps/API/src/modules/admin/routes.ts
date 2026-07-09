import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/http.js";
import { Product } from "../../models/Product.js";
import { Order } from "../../models/Order.js";
import { User } from "../../models/User.js";
import { adminProductRoutes } from "./products.js";
import { adminOrderRoutes } from "./orders.js";
import { adminCategoryRoutes } from "./categories.js";
import { adminBrandRoutes } from "./brands.js";
import { adminCouponRoutes } from "./coupons.js";
import { adminReviewRoutes } from "./reviews.js";
import { adminCmsRoutes } from "./cms.js";
import { adminBannerRoutes } from "./banners.js";
import { adminBlogRoutes } from "./blogs.js";
import { adminReportRoutes } from "./reports.js";
import { adminCustomerRoutes } from "./customers.js";
import { adminInventoryRoutes } from "./inventory.js";
import { adminAuditRoutes } from "./audit.js";
import { adminSettingRoutes } from "./settings.js";
import { adminRoleRoutes } from "./roles.js";

const r = Router();
r.use(requireAuth);
const ADMIN = requireRole("admin", "superadmin");
const STAFF = requireRole("admin", "superadmin", "staff");
const CATALOG = requireRole("admin", "superadmin", "staff", "vendor");

// Dashboard: headline metrics for Sales / Revenue / Customers / etc.
r.get("/dashboard", STAFF, asyncHandler(async (_req, res) => {
  const [orders, revenueAgg, customers, products] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([{ $match: { "payment.status": "paid" } }, { $group: { _id: null, total: { $sum: "$amounts.total" } } }]),
    User.countDocuments({ role: "customer" }),
    Product.countDocuments(),
  ]);
  res.json({ orders, revenue: revenueAgg[0]?.total ?? 0, customers, products });
}));

r.use("/products", CATALOG, adminProductRoutes);     // full CRUD (pattern for the rest)
r.use("/orders", STAFF, adminOrderRoutes);         // list/detail/status/shipment tracking
r.use("/categories", STAFF, adminCategoryRoutes);  // CRUD + category tree
r.use("/brands", STAFF, adminBrandRoutes);         // CRUD
r.use("/coupons", ADMIN, adminCouponRoutes);       // full coupon engine + CRUD
r.use("/reviews", STAFF, adminReviewRoutes);       // moderation queue + approve/reject
r.use("/cms", ADMIN, adminCmsRoutes);              // editable pages/sections/menus/FAQ (upsert by key)
r.use("/banners", ADMIN, adminBannerRoutes);       // hero/offer banners + scheduling
r.use("/blogs", ADMIN, adminBlogRoutes);           // blog posts + publish
r.use("/reports", STAFF, adminReportRoutes);       // sales/revenue/products/customers/conversion/abandoned
r.use("/customers", STAFF, adminCustomerRoutes);   // list/detail/suspend + lifetime spend
r.use("/inventory", CATALOG, adminInventoryRoutes);  // stock overview + adjustments (product + variant)
r.use("/audit-logs", ADMIN, adminAuditRoutes);     // read-only audit viewer
r.use("/settings", ADMIN, adminSettingRoutes);     // key-value store (upsert by key)
r.use("/roles", ADMIN, adminRoleRoutes);           // role→permission matrix + assign roles


export const adminRoutes = r;
