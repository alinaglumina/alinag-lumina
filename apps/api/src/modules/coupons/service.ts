import { Coupon } from "../../models/Coupon.js";
import { Product } from "../../models/Product.js";
import { Order } from "../../models/Order.js";
import { badRequest } from "../../lib/http.js";

export interface CartLine { product: string; qty: number; price: number; }
export interface CartSnapshot { lines: CartLine[]; subtotal: number; }

// Build a server-authoritative cart snapshot from productIds + quantities (never trust client prices).
export async function snapshotCart(items: { productId: string; qty: number }[]): Promise<CartSnapshot> {
  const ids = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: ids }, status: "active" }).select("price").lean();
  const priceById = new Map(products.map((p: any) => [String(p._id), p.price]));
  const lines: CartLine[] = items
    .filter((i) => priceById.has(i.productId))
    .map((i) => ({ product: i.productId, qty: Math.max(1, i.qty), price: priceById.get(i.productId)! }));
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  return { lines, subtotal };
}

export interface CouponResult {
  code: string; label?: string; type: string;
  discount: number;         // rupees off the subtotal
  freeShipping: boolean;
  message: string;
}


// Pure discount math (no DB) — unit-testable in isolation.
export interface CouponLike {
  code: string; label?: string; type: string; value?: number; cap?: number | null;
  bxgy?: { buyQty?: number; getQty?: number; productScope?: any[] };
}
export function computeDiscount(coupon: CouponLike, cart: CartSnapshot): { discount: number; freeShipping: boolean } {
  let discount = 0, freeShipping = false;
  switch (coupon.type) {
    case "percent":
      discount = Math.round((cart.subtotal * (coupon.value ?? 0)) / 100);
      if (coupon.cap != null) discount = Math.min(discount, coupon.cap);
      break;
    case "fixed":
      discount = Math.min(coupon.value ?? 0, cart.subtotal);
      break;
    case "free_shipping":
      freeShipping = true;
      break;
    case "bxgy": {
      const { buyQty = 1, getQty = 1, productScope = [] } = coupon.bxgy ?? {};
      const scopeIds = new Set((productScope as any[]).map((x) => String(x)));
      const eligible = cart.lines.filter((l) => scopeIds.size === 0 || scopeIds.has(l.product));
      const units: number[] = [];
      eligible.forEach((l) => { for (let i = 0; i < l.qty; i++) units.push(l.price); });
      units.sort((a, b) => a - b);
      const sets = Math.floor(units.length / (buyQty + getQty));
      discount = units.slice(0, sets * getQty).reduce((s, p) => s + p, 0);
      break;
    }
  }
  return { discount, freeShipping };
}

// The engine: validate a code against a cart (+ optional user) and compute the discount.
// Throws badRequest with a human reason when the coupon can't apply.
export async function evaluateCoupon(code: string, cart: CartSnapshot, userId?: string): Promise<CouponResult> {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon || coupon.status !== "active") throw badRequest("Invalid coupon code");

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw badRequest("This coupon isn't active yet");
  if (coupon.expiresAt && coupon.expiresAt < now) throw badRequest("This coupon has expired");
  if (coupon.minCartValue && cart.subtotal < coupon.minCartValue)
    throw badRequest(`Add ₹${coupon.minCartValue - cart.subtotal} more to use this coupon`);

  // Total usage cap
  if (coupon.usageLimit != null && (coupon.usedCount ?? 0) >= coupon.usageLimit)
    throw badRequest("This coupon has reached its usage limit");

  // Per-user cap (count prior paid redemptions)
  if (userId && coupon.perUserLimit != null) {
    const used = await Order.countDocuments({ user: userId, "coupon.code": coupon.code, "payment.status": "paid" });
    if (used >= coupon.perUserLimit) throw badRequest("You've already used this coupon");
  }

  const { discount, freeShipping } = computeDiscount(coupon as any, cart);
  if (coupon.type === "bxgy" && discount === 0)
    throw badRequest("Add more eligible items to unlock this Buy-X-Get-Y offer");
  if (!["percent", "fixed", "free_shipping", "bxgy"].includes(coupon.type))
    throw badRequest("Unsupported coupon type");

  return {
    code: coupon.code, label: coupon.label ?? undefined, type: coupon.type,
    discount, freeShipping,
    message: freeShipping ? "Free shipping applied" : `You saved ₹${discount}`,
  };
}

// Call this AFTER an order is successfully placed with the coupon, to increment global usage.
export async function recordRedemption(code: string) {
  await Coupon.updateOne({ code: code.toUpperCase() }, { $inc: { usedCount: 1 } });
}
