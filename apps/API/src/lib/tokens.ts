import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";

export interface AccessClaims { sub: string; role: string; sid: string; }

export const signAccess = (c: AccessClaims) =>
  jwt.sign(c, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_TTL } as jwt.SignOptions);

export const verifyAccess = (t: string) => jwt.verify(t, env.JWT_SECRET) as AccessClaims & { iat: number; exp: number };

// Refresh tokens are opaque, random, and stored HASHED (never plaintext) against a session.
export const newRefreshToken = () => crypto.randomBytes(48).toString("base64url");
export const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

// 6-digit numeric OTP for email/SMS login + verification.
export const newOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
