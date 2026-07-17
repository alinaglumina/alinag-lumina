import { Schema, model } from "mongoose";
// Self-referencing tree → categories + subcategories.
const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    image: String, icon: String,
    order: { type: Number, default: 0 },
    seo: { title: String, description: String, keywords: [String] },
    status: { type: String, enum: ["active", "hidden"], default: "active" },
  },
  { timestamps: true }
);
export const Category = model("Category", CategorySchema);
