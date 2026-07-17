import crypto from "node:crypto";
import { Product } from "../../models/Product.js";
import { Order } from "../../models/Order.js";
import { User } from "../../models/User.js";
import { evaluateCoupon, type CartSnapshot } from "../coupons/service.js";
import { badRequest } from "../../lib/http.js";

export type DeliveryType = "standard" | "express" | "same_day";

export interface CheckoutItemInput { productId: string; qty: number; variant?: string; }
export interface RichLine { product: string; name: string; sku?: string; glyph?: string; variant?: string; qty: number; price: number; gstPercent: number; }

// Build server-authoritative order lines from the client's productId+qty (prices from DB, never the client).
export async function buildCart(items: CheckoutItemInput[]): Promise<{ lines: RichLine[]; snapshot: CartSnapshot }> {
  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) }, status: "active" })
    .select("name sku price gstPercent stock").lean();
  const byId = new Map(products.map((p: any) => [String(p._id), p]));
  const lines: RichLine[] = [];
  for (const i of items) {
    const p: any = byId.get(i.productId);
    if (!p) throw badRequest("One or more items are unavailable");
    if ((p.stock ?? 0) < i.qty) throw badRequest(`Only ${p.stock} left of ${p.name}`);
    lines.push({ product: i.productId, name: p.name, sku: p.sku, variant: i.variant, qty: Math.max(1, i.qty), price: p.price, gstPercent: p.gstPercent ?? 18 });
  }
  if (!lines.length) throw badRequest("Your cart is empty");
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  return { lines, snapshot: { lines: lines.map((l) => ({ product: l.product, qty: l.qty, price: l.price })), subtotal } };
}

// Prices are GST-inclusive (storefront convention). Extract the tax component for the invoice.
export function inclusiveTax(lines: RichLine[]): number {
  return Math.round(lines.reduce((s, l) => { const g = l.gstPercent; return s + (l.price * l.qty) * (g / (100 + g)); }, 0));
}

export function shippingQuote(deliveryType: DeliveryType, subtotal: number, freeShipping: boolean): number {
  if (freeShipping || subtotal >= 999) return 0;              // free over ₹999 or via coupon
  return ({ standard: 49, express: 99, same_day: 149 } as const)[deliveryType] ?? 49;
}

const orderNo = () => "LUM-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();

export interface CheckoutInput {
  items: CheckoutItemInput[];
  addressId?: string;
  shippingAddress?: any;
  couponCode?: string;
  paymentMethod: "upi" | "card" | "netbanking" | "wallet" | "cod";
  deliveryType?: DeliveryType;
}

// Assemble + persist a PENDING order (inventory is reduced later, on payment success).
export async function createOrder(userId: string, input: CheckoutInput, idempotencyKey?: string) {
  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey, user: userId });
    if (existing) return existing;             // safe replay — no duplicate order
  }

  const { lines, snapshot } = await buildCart(input.items);

  // resolve address
  let shippingAddress = input.shippingAddress;
  if (!shippingAddress && input.addressId) {
    const user = await User.findById(userId).select("addresses").lean();
    shippingAddress = (user?.addresses ?? []).find((a: any) => String(a._id) === input.addressId);
  }
  if (!shippingAddress) throw badRequest("A shipping address is required");

  // coupon (optional)
  let discount = 0, freeShipping = false, couponCode: string | undefined;
  if (input.couponCode) {
    const applied = await evaluateCoupon(input.couponCode, snapshot, userId);
    discount = applied.discount; freeShipping = applied.freeShipping; couponCode = applied.code;
  }

  const deliveryType = input.deliveryType ?? "standard";
  const shipping = shippingQuote(deliveryType, snapshot.subtotal, freeShipping);
  const tax = inclusiveTax(lines);
  const total = Math.max(0, snapshot.subtotal - discount) + shipping;

  const order = await Order.create({
    orderNo: orderNo(),
    idempotencyKey,
    user: userId,
    items: lines.map((l) => ({ product: l.product, name: l.name, sku: l.sku, variant: l.variant, qty: l.qty, price: l.price, gstPercent: l.gstPercent })),
    amounts: { subtotal: snapshot.subtotal, discount, shipping, tax, total },
    coupon: couponCode ? { code: couponCode, discount } : undefined,
    shippingAddress,
    billingAddress: shippingAddress,
    payment: { method: input.paymentMethod, status: input.paymentMethod === "cod" ? "pending" : "pending", gateway: input.paymentMethod === "cod" ? "COD" : "Razorpay" },
    status: "created",
  });
  return order;
}
