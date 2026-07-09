import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound, badRequest } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { Coupon } from "../../models/Coupon.js";
import { audit } from "../../utils/audit.js";

const r = Router();

const fields = {
  code: z.string().min(3).transform((s) => s.toUpperCase()),
  label: z.string().optional(),
  type: z.enum(["percent", "fixed", "free_shipping", "bxgy"]),
  value: z.number().optional(),
  cap: z.number().optional(),
  minCartValue: z.number().optional(),
  bxgy: z.object({ buyQty: z.number(), getQty: z.number(), productScope: z.array(z.string()).optional() }).optional(),
  usageLimit: z.number().optional(),
  perUserLimit: z.number().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  status: z.enum(["active", "paused", "expired"]).optional(),
};

// Enforce that type-specific fields are present.
function checkShape(body: any) {
  if ((body.type === "percent" || body.type === "fixed") && body.value == null)
    throw badRequest(`'${body.type}' coupons require a value`);
  if (body.type === "bxgy" && (!body.bxgy?.buyQty || !body.bxgy?.getQty))
    throw badRequest("BXGY coupons require buyQty and getQty");
}

r.get("/", validate(z.object({ q: z.string().optional(), status: z.string().optional() }), "query"),
  asyncHandler(async (req, res) => {
    const { q, status } = req.query as any;
    const filter: any = {};
    if (status) filter.status = status;
    if (q) filter.code = new RegExp(q, "i");
    const items = await Coupon.find(filter).sort("-createdAt").lean();
    res.json({ items });
  }));

r.get("/:id", asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).lean();
  if (!coupon) throw notFound("Coupon not found");
  res.json({ coupon });
}));

r.post("/", validate(z.object(fields)), asyncHandler(async (req, res) => {
  checkShape(req.body);
  if (await Coupon.exists({ code: req.body.code })) throw badRequest("A coupon with this code already exists");
  const coupon = await Coupon.create(req.body);
  await audit(req, "coupon.create", "Coupon", String(coupon._id), null, coupon.toObject());
  res.status(201).json({ coupon });
}));

r.put("/:id", validate(z.object({ ...fields, code: fields.code.optional(), type: fields.type.optional() })),
  asyncHandler(async (req, res) => {
    const before = await Coupon.findById(req.params.id).lean();
    if (!before) throw notFound("Coupon not found");
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await audit(req, "coupon.update", "Coupon", req.params.id, before, coupon!.toObject());
    res.json({ coupon });
  }));

r.delete("/:id", asyncHandler(async (req, res) => {
  const before = await Coupon.findById(req.params.id).lean();
  if (!before) throw notFound("Coupon not found");
  await Coupon.findByIdAndDelete(req.params.id);
  await audit(req, "coupon.delete", "Coupon", req.params.id, before, null);
  res.json({ ok: true });
}));

export const adminCouponRoutes = r;
