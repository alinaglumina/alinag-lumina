import { Schema, model } from "mongoose";
const ReviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: String, body: String,
    images: [String], videos: [String],
    verifiedPurchase: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });
export const Review = model("Review", ReviewSchema);

ReviewSchema.index({ product: 1, status: 1 });
ReviewSchema.index({ status: 1, createdAt: -1 });
