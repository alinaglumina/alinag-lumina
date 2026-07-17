import crypto from "node:crypto";
import { Wishlist } from "../../models/Wishlist.js";
import { Product } from "../../models/Product.js";

export type Owner = { user: string } | { sessionId: string };

async function getOrCreate(owner: Owner) {
  let wl = await Wishlist.findOne(owner);
  if (!wl) wl = await Wishlist.create({ ...owner, products: [] });
  return wl;
}

export async function viewWishlist(owner: Owner) {
  const wl = await getOrCreate(owner);
  const products = await Product.find({ _id: { $in: wl.products } }).select("name price mrp images slug stock").lean();
  return { id: wl._id, shareId: wl.shareId ?? null, isPublic: wl.isPublic, products };
}

// Toggle: add if absent, remove if present. Returns { added: boolean }.
export async function toggle(owner: Owner, productId: string) {
  const wl = await getOrCreate(owner);
  const has = wl.products.some((p: any) => String(p) === productId);
  if (has) wl.products = wl.products.filter((p: any) => String(p) !== productId) as any;
  else wl.products.push(productId as any);
  await wl.save();
  return { added: !has, count: wl.products.length };
}

export async function remove(owner: Owner, productId: string) {
  const wl = await getOrCreate(owner);
  wl.products = wl.products.filter((p: any) => String(p) !== productId) as any;
  await wl.save();
  return viewWishlist(owner);
}

// Make the wishlist shareable via a public link (returns the shareId).
export async function makeShareable(owner: Owner) {
  const wl = await getOrCreate(owner);
  if (!wl.shareId) wl.shareId = "wl_" + crypto.randomBytes(8).toString("hex");
  wl.isPublic = true;
  await wl.save();
  return { shareId: wl.shareId };
}

// Public read by shareId (only if public).
export async function getShared(shareId: string) {
  const wl = await Wishlist.findOne({ shareId, isPublic: true });
  if (!wl) return null;
  const products = await Product.find({ _id: { $in: wl.products } }).select("name price mrp images slug").lean();
  return { shareId, products };
}

// On login: fold a guest wishlist into the user's (dedupe), then delete the guest one.
export async function mergeGuestWishlist(sessionId: string, userId: string) {
  const guest = await Wishlist.findOne({ sessionId });
  if (!guest) return viewWishlist({ user: userId });
  const user = await getOrCreate({ user: userId });
  const ids = new Set(user.products.map((p: any) => String(p)));
  guest.products.forEach((p: any) => { if (!ids.has(String(p))) user.products.push(p); });
  await user.save();
  await guest.deleteOne();
  return viewWishlist({ user: userId });
}
