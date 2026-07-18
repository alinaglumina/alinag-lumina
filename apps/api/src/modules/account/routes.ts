import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { User } from "../../models/User.js";
import { Order } from "../../models/Order.js";

const r = Router();

const clean = "-passwordHash -otp -resetTokenHash -verifyTokenHash -twoFactor.secret -verifyTokenHash";

// Profile
r.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user!.sub).select(clean).lean();
  if (!user) throw notFound("User not found");
  res.json({ user });
}));
r.put("/me", requireAuth, validate(z.object({ name: z.string().min(2).optional(), phone: z.string().optional(), avatar: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user!.sub, req.body, { new: true }).select(clean);
    res.json({ user });
  }));

// My orders
r.get("/me/orders", requireAuth, validate(z.object({ page: z.coerce.number().default(1), limit: z.coerce.number().default(10) }), "query"),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as any;
    const [items, total] = await Promise.all([
      Order.find({ user: req.user!.sub }).select("orderNo amounts status payment.status shipment.status createdAt items")
        .sort("-createdAt").skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments({ user: req.user!.sub }),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  }));
r.get("/me/orders/:id", requireAuth, asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user!.sub }).lean();
  if (!order) throw notFound("Order not found");
  res.json({ order });
}));

// Addresses (embedded on the user)
const addressSchema = z.object({
  tag: z.string().optional(), name: z.string(), phone: z.string(),
  line1: z.string(), line2: z.string().optional(), city: z.string(), state: z.string(),
  pincode: z.string(), country: z.string().default("IN"), isDefault: z.boolean().optional(),
});
r.get("/me/addresses", requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user!.sub).select("addresses").lean();
  res.json({ addresses: user?.addresses ?? [] });
}));
r.post("/me/addresses", requireAuth, validate(addressSchema), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user!.sub);
  if (!user) throw notFound("User not found");
  if (req.body.isDefault) user.addresses.forEach((a: any) => (a.isDefault = false));
  user.addresses.push(req.body);
  await user.save();
  res.status(201).json({ addresses: user.addresses });
}));
r.put("/me/addresses/:addrId", requireAuth, validate(addressSchema.partial()), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user!.sub);
  if (!user) throw notFound("User not found");
  const addr = (user.addresses as any).id(req.params.addrId);
  if (!addr) throw notFound("Address not found");
  if (req.body.isDefault) user.addresses.forEach((a: any) => (a.isDefault = false));
  addr.set(req.body);
  await user.save();
  res.json({ addresses: user.addresses });
}));
r.delete("/me/addresses/:addrId", requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user!.sub);
  if (!user) throw notFound("User not found");
  (user.addresses as any).id(req.params.addrId)?.deleteOne();
  await user.save();
  res.json({ addresses: user.addresses });
}));

export const accountRoutes = r;
