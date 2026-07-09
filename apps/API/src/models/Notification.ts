import { Schema, model } from "mongoose";
const NotificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },  // null = admin/broadcast
    audience: { type: String, enum: ["user", "admin"], default: "user" },
    channel: { type: String, enum: ["inapp", "email", "sms", "push"], default: "inapp" },
    type: String, title: String, body: String, data: Object,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const Notification = model("Notification", NotificationSchema);

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ audience: 1, createdAt: -1 });
