import { Schema, model, type InferSchemaType } from "mongoose";

const AddressSchema = new Schema(
  {
    tag: { type: String, default: "Home" },
    name: String, phone: String,
    line1: String, line2: String, city: String, state: String,
    pincode: String, country: { type: String, default: "IN" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: { type: String, index: true },
    passwordHash: { type: String },                 // absent for OAuth-only users
    role: { type: String, enum: ["customer", "vendor", "staff", "admin", "superadmin"], default: "customer", index: true },

    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    googleId: { type: String, index: true },
    avatar: String,

    // OTP for email/SMS login + verification (short-lived, single-purpose)
    otp: { code: String, expiresAt: Date, purpose: { type: String, enum: ["login", "verify", "reset"] } },
    // Password reset token (hashed)
    resetTokenHash: String, resetTokenExpiresAt: Date,
    // Email verification token (hashed)
    verifyTokenHash: String,

    twoFactor: { enabled: { type: Boolean, default: false }, secret: String },

    // Account lockout after repeated failed logins
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    addresses: [AddressSchema],
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    wallet: { balance: { type: Number, default: 0 }, currency: { type: String, default: "INR" } },

    status: { type: String, enum: ["active", "suspended", "deleted"], default: "active" },
  },
  { timestamps: true }
);

UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User = model("User", UserSchema);
