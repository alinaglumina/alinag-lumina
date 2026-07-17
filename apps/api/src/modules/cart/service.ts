import { Cart } from "../../models/Cart.js";
import { Product } from "../../models/Product.js";

export type Owner = { user: string } | { sessionId: string };

// Pure merge helper (unit-testable): combine two item lists, summing quantities per product+variant.
export interface CartItem { product: string; variant?: string; qty: number; }
export function mergeItems(a: CartItem[], b: CartItem[]): CartItem[] {
  const key = (i: CartItem) => `${i.product}::${i.variant ?? ""}`;
  const map = new Map<string, CartItem>();
  for (const i of [...a, ...b]) {
    const k = key(i);
    const ex = map.get(k);
    if (ex) ex.qty += i.qty; else map.set(k, { ...i });
  }
  return [...map.values()];
}

export async function getOrCreateCart(owner: Owner) {
  let cart = await Cart.findOne(owner);
  if (!cart) cart = await Cart.create({ ...owner, items: [] });
  return cart;
}

// Return the cart with product details + computed totals (lenient about stock for display).
export async function viewCart(owner: Owner) {
  const cart = await getOrCreateCart(owner);
  const products = await Product.find({ _id: { $in: cart.items.map((i: any) => i.product) } })
    .select("name price mrp images stock slug").lean();
  const byId = new Map(products.map((p: any) => [String(p._id), p]));
  const lines = cart.items.map((i: any) => {
    const p: any = byId.get(String(i.product));
    return { product: i.product, variant: i.variant, qty: i.qty,
      name: p?.name, price: p?.price ?? 0, mrp: p?.mrp, image: p?.images?.[0], slug: p?.slug,
      inStock: (p?.stock ?? 0) >= i.qty, lineTotal: (p?.price ?? 0) * i.qty };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  return { id: cart._id, items: lines, subtotal, couponCode: cart.couponCode ?? null };
}

export async function addItem(owner: Owner, productId: string, qty = 1, variant?: string) {
  const cart = await getOrCreateCart(owner);
  const line = cart.items.find((i: any) => String(i.product) === productId && (i.variant ?? "") === (variant ?? ""));
  if (line) line.qty = (line.qty ?? 0) + qty; else cart.items.push({ product: productId as any, variant, qty });
  await cart.save();
  return viewCart(owner);
}

export async function setItemQty(owner: Owner, productId: string, qty: number, variant?: string) {
  const cart = await getOrCreateCart(owner);
  const idx = cart.items.findIndex((i: any) => String(i.product) === productId && (i.variant ?? "") === (variant ?? ""));
  if (idx >= 0) { if (qty <= 0) cart.items.splice(idx, 1); else cart.items[idx].qty = qty; }
  await cart.save();
  return viewCart(owner);
}

export async function removeItem(owner: Owner, productId: string, variant?: string) {
  const cart = await getOrCreateCart(owner);
  cart.items = cart.items.filter((i: any) => !(String(i.product) === productId && (i.variant ?? "") === (variant ?? ""))) as any;
  await cart.save();
  return viewCart(owner);
}

export async function clearCart(owner: Owner) {
  await Cart.updateOne(owner, { items: [], couponCode: null });
  return viewCart(owner);
}

// On login: fold a guest cart (by sessionId) into the user's cart, then delete the guest cart.
export async function mergeGuestCart(sessionId: string, userId: string) {
  const guest = await Cart.findOne({ sessionId });
  if (!guest) return viewCart({ user: userId });
  const user = await getOrCreateCart({ user: userId });
  user.items = mergeItems(user.items as any, guest.items as any) as any;
  await user.save();
  await guest.deleteOne();
  return viewCart({ user: userId });
}
