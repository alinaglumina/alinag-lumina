import { Schema, model } from "mongoose";
// Key-value store for store config: name, currency, GST number, shipping thresholds, feature flags…
const SettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },   // "store.name", "shipping.freeThreshold"
    value: Schema.Types.Mixed,
    group: { type: String, default: "general", index: true },
    isPublic: { type: Boolean, default: false },                        // safe to expose to the storefront
    description: String,
  },
  { timestamps: true }
);
export const Setting = model("Setting", SettingSchema);
