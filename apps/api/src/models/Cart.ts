import { Schema, model } from "mongoose";
// Supports guest carts (by sessionId) and user carts. Also powers abandoned-cart reports.
const CartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    sessionId: { type: String, index: true },
    items: [{ product: { type: Schema.Types.ObjectId, ref: "Product" }, variant: String, qty: Number }],
    couponCode: String,
    abandonedNotifiedAt: Date,
  },
  { timestamps: true }
);
export const Cart = model("Cart", CartSchema);

CartSchema.index({ updatedAt: 1 });
