import { Schema, model } from "mongoose";
// Immutable trail of privileged actions (who did what, from where).
const AuditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, index: true },     // "product.update", "order.refund", "user.role.change"
    entity: { type: String }, entityId: String,
    before: Object, after: Object,
    ip: String, userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
export const AuditLog = model("AuditLog", AuditLogSchema);

AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ entity: 1, entityId: 1 });
