import { Schema, model } from "mongoose";

// One row per logged-in device. Refresh tokens are stored hashed and rotated on use.
const SessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true, index: true },
    device: {
      name: String,          // "Chrome on macOS"
      userAgent: String,
      ip: String,
    },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);
// TTL index: expired sessions auto-purge.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = model("Session", SessionSchema);
