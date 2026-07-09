import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { Order } from "../../models/Order.js";
import { Product } from "../../models/Product.js";
import { User } from "../../models/User.js";
import { Cart } from "../../models/Cart.js";
import { growthPct, aov, conversionRate, fillDailySeries } from "../../lib/analytics.js";

const r = Router();
const range = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() });
const paidMatch = (from?: Date, to?: Date) => ({
  "payment.status": "paid",
  ...(from || to ? { createdAt: { ...(from && { $gte: from }), ...(to && { $lte: to }) } } : {}),
});
const sumRevenue = async (m: any) => (await Order.aggregate([{ $match: m }, { $group: { _id: null, total: { $sum: "$amounts.total" }, n: { $sum: 1 } } }]))[0] ?? { total: 0, n: 0 };

// Headline KPIs with period-over-period growth.
r.get("/overview", validate(range, "query"), asyncHandler(async (req, res) => {
  const { from, to } = req.query as any;
  const end = to ?? new Date();
  const start = from ?? new Date(end.getTime() - 30 * 864e5);
  const span = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - span);

  const [cur, prev, newCustomers, prevCustomers] = await Promise.all([
    sumRevenue(paidMatch(start, end)),
    sumRevenue(paidMatch(prevStart, start)),
    User.countDocuments({ role: "customer", createdAt: { $gte: start, $lte: end } }),
    User.countDocuments({ role: "customer", createdAt: { $gte: prevStart, $lte: start } }),
  ]);
  res.json({
    revenue: { value: cur.total, growth: growthPct(cur.total, prev.total) },
    orders: { value: cur.n, growth: growthPct(cur.n, prev.n) },
    aov: { value: aov(cur.total, cur.n), previous: aov(prev.total, prev.n) },
    newCustomers: { value: newCustomers, growth: growthPct(newCustomers, prevCustomers) },
    period: { from: start, to: end },
  });
}));

// Daily sales series (revenue + orders), gap-filled for charts.
r.get("/sales", validate(range, "query"), asyncHandler(async (req, res) => {
  const { from, to } = req.query as any;
  const end = to ?? new Date();
  const start = from ?? new Date(end.getTime() - 30 * 864e5);
  const rows = await Order.aggregate([
    { $match: paidMatch(start, end) },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$amounts.total" }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const revenueSeries = fillDailySeries(rows.map((x: any) => ({ date: x._id, value: x.revenue })), start, end);
  const orderSeries = fillDailySeries(rows.map((x: any) => ({ date: x._id, value: x.orders })), start, end);
  res.json({ revenueSeries, orderSeries });
}));

// Revenue split by payment method.
r.get("/revenue/by-method", validate(range, "query"), asyncHandler(async (req, res) => {
  const { from, to } = req.query as any;
  const rows = await Order.aggregate([
    { $match: paidMatch(from, to) },
    { $group: { _id: "$payment.method", revenue: { $sum: "$amounts.total" }, orders: { $sum: 1 } } },
    { $sort: { revenue: -1 } },
  ]);
  res.json({ byMethod: rows.map((x: any) => ({ method: x._id, revenue: x.revenue, orders: x.orders })) });
}));

// Top products by units + revenue, plus low-stock list.
r.get("/products/top", validate(z.object({ ...range.shape, limit: z.coerce.number().default(10) }), "query"), asyncHandler(async (req, res) => {
  const { from, to, limit } = req.query as any;
  const [top, lowStock] = await Promise.all([
    Order.aggregate([
      { $match: paidMatch(from, to) },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", name: { $first: "$items.name" }, units: { $sum: "$items.qty" }, revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } } } },
      { $sort: { revenue: -1 } }, { $limit: limit },
    ]),
    Product.find({ $expr: { $lte: ["$stock", "$lowStockThreshold"] } }).select("name sku stock lowStockThreshold").limit(20).lean(),
  ]);
  res.json({ top, lowStock });
}));

// New vs returning customers + top spenders.
r.get("/customers", validate(range, "query"), asyncHandler(async (req, res) => {
  const { from, to } = req.query as any;
  const spend = await Order.aggregate([
    { $match: paidMatch(from, to) },
    { $group: { _id: "$user", spent: { $sum: "$amounts.total" }, orders: { $sum: 1 } } },
  ]);
  const returning = spend.filter((s: any) => s.orders > 1).length;
  const top = [...spend].sort((a: any, b: any) => b.spent - a.spent).slice(0, 10);
  const withNames = await User.find({ _id: { $in: top.map((t: any) => t._id) } }).select("name email").lean();
  const nameById = new Map(withNames.map((u: any) => [String(u._id), u]));
  res.json({
    buyers: spend.length, returning, newBuyers: spend.length - returning,
    topCustomers: top.map((t: any) => ({ user: nameById.get(String(t._id)), spent: t.spent, orders: t.orders })),
  });
}));

// Checkout conversion (paid orders ÷ carts created) — swap carts for real sessions when analytics lands.
r.get("/conversion", validate(range, "query"), asyncHandler(async (req, res) => {
  const { from, to } = req.query as any;
  const window = from || to ? { createdAt: { ...(from && { $gte: from }), ...(to && { $lte: to }) } } : {};
  const [carts, paid] = await Promise.all([
    Cart.countDocuments(window),
    Order.countDocuments(paidMatch(from, to)),
  ]);
  res.json({ carts, paidOrders: paid, conversionRate: conversionRate(paid, carts) });
}));

// Abandoned carts: non-empty carts idle beyond a threshold (for recovery emails / reports).
r.get("/abandoned-carts", validate(z.object({ olderThanHours: z.coerce.number().default(4) }), "query"), asyncHandler(async (req, res) => {
  const cutoff = new Date(Date.now() - (req.query as any).olderThanHours * 3600e3);
  const carts = await Cart.find({ "items.0": { $exists: true }, updatedAt: { $lte: cutoff } })
    .populate("user", "name email").sort("-updatedAt").limit(100).lean();
  res.json({ count: carts.length, carts });
}));

export const adminReportRoutes = r;
