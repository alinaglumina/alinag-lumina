import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { createOrder } from "./service.js";

const r = Router();

const schema = z.object({
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().positive(), variant: z.string().optional() })).min(1),
  addressId: z.string().optional(),
  shippingAddress: z.any().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(["upi", "card", "netbanking", "wallet", "cod"]),
  deliveryType: z.enum(["standard", "express", "same_day"]).optional(),
});

// POST /checkout → builds a priced, pending Order. Pass an Idempotency-Key header to make
// double-submits safe. The returned orderId then goes to POST /payments/create.
r.post("/checkout", requireAuth, validate(schema), asyncHandler(async (req, res) => {
  const idempotencyKey = (req.headers["idempotency-key"] as string) || undefined;
  const order = await createOrder(req.user!.sub, req.body, idempotencyKey);
  res.status(201).json({
    orderId: order._id,
    orderNo: order.orderNo,
    amounts: order.amounts,
    payment: { method: order.payment!.method, status: order.payment!.status },
    next: order.payment!.method === "cod" ? "confirm_cod" : "create_payment",
  });
}));

export const checkoutRoutes = r;
