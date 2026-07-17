import { Schema, model } from "mongoose";
// Guest (sessionId) + logged-in wishlists, shareable via shareId.
const WishlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    sessionId: { type: String, index: true },
    shareId: { type: String, index: true },
    products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const Wishlist = model("Wishlist", WishlistSchema);
