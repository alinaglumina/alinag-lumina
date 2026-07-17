import { Schema, model, type InferSchemaType } from "mongoose";

const VariantSchema = new Schema(
  {
    sku: { type: String, required: true },
    barcode: String,
    attributes: { type: Map, of: String },   // { color: "Blue", size: "M" }
    price: Number, mrp: Number,
    stock: { type: Number, default: 0 },
    images: [String],
  },
  { _id: true }
);

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, index: "text" },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    shortDescription: String,

    // Media
    images: [String],                          // multiple product images (Cloudinary URLs)
    videos: [String],                          // video gallery

    // Identity / taxonomy
    sku: { type: String, index: true },
    barcode: String,
    brand: { type: Schema.Types.ObjectId, ref: "Brand", index: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    subcategory: { type: Schema.Types.ObjectId, ref: "Category", index: true },

    // Pricing & tax (India)
    price: { type: Number, required: true },
    mrp: Number,
    discountPercent: Number,
    gstPercent: { type: Number, default: 18 },
    hsnCode: String,

    // Variants & inventory
    variants: [VariantSchema],
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },

    // Merchandising / facets
    colors: [String],
    sizes: [String],
    tags: [String],
    isNewArrival: { type: Boolean, default: false, index: true },
    featured: { type: Boolean, default: false, index: true },

    ratings: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    related: [{ type: Schema.Types.ObjectId, ref: "Product" }],

    seo: { title: String, description: String, keywords: [String] },

    status: { type: String, enum: ["draft", "active", "archived"], default: "active", index: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: "text", tags: "text", "seo.keywords": "text" });
ProductSchema.index({ price: 1 });
ProductSchema.index({ "ratings.average": -1 });

export type ProductDoc = InferSchemaType<typeof ProductSchema>;
export const Product = model("Product", ProductSchema);
