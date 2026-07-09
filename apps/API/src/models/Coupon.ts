import { Schema, model } from "mongoose";
const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    label: String,
    type: { type: String, enum: ["percent", "fixed", "free_shipping", "bxgy"], required: true },
    value: Number,
    cap: Number,                       // max discount for percent
    minCartValue: Number,
    bxgy: { buyQty: Number, getQty: Number, productScope: [{ type: Schema.Types.ObjectId, ref: "Product" }] },
    usageLimit: Number,                // total redemptions allowed
    perUserLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    startsAt: Date, expiresAt: Date,
    status: { type: String, enum: ["active", "paused", "expired"], default: "active" },
  },
  { timestamps: true }
);
export const Coupon = model("Coupon", CouponSchema);
