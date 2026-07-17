import { Schema, model } from "mongoose";
const BrandSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    logo: String, description: String,
    seo: { title: String, description: String, keywords: [String] },
    status: { type: String, enum: ["active", "hidden"], default: "active" },
  },
  { timestamps: true }
);
export const Brand = model("Brand", BrandSchema);
