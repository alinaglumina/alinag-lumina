import argon2 from "argon2";
import { User } from "../../models/User.js";
import { Session } from "../../models/Session.js";
import { env } from "../../config/env.js";
import { signAccess, newRefreshToken, hashToken, newOtp } from "../../lib/tokens.js";
import { badRequest, unauthorized } from "../../lib/http.js";
import { generateSecret, otpauthURL, verifyTotp } from "../../lib/totp.js";

const REFRESH_MS = 30 * 24 * 60 * 60_000;         // 30 days
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60_000;

export const hashPassword = (p: string) => argon2.hash(p);
export const verifyPassword = (hash: string, p: string) => argon2.verify(hash, p);

// Create a device session + return an access token and the raw refresh token (stored hashed).
export async function issueSession(userId: string, role: string, device: { userAgent?: string; ip?: string; name?: string }) {
  const raw = newRefreshToken();
  const session = await Session.create({
    user: userId, refreshTokenHash: hashToken(raw),
    device, expiresAt: new Date(Date.now() + REFRESH_MS),
  });
  const accessToken = signAccess({ sub: userId, role, sid: String(session._id) });
  return { accessToken, refreshToken: raw, sessionId: String(session._id) };
}

// Rotate: validate the incoming refresh token, revoke it, issue a fresh pair.
export async function rotateRefresh(raw: string) {
  const session = await Session.findOne({ refreshTokenHash: hashToken(raw), revoked: false });
  if (!session || session.expiresAt < new Date()) throw unauthorized("Invalid refresh token");
  const user = await User.findById(session.user);
  if (!user) throw unauthorized();
  session.revoked = true; await session.save();     // one-time use → rotation
  return issueSession(String(user._id), user.role, session.device as any);
}

export async function registerUser(name: string, email: string, password: string) {
  const exists = await User.findOne({ email });
  if (exists) throw badRequest("Email already registered");
  const passwordHash = await hashPassword(password);
  return User.create({ name, email, passwordHash });
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash) throw unauthorized("Invalid credentials");
  if (user.lockUntil && user.lockUntil > new Date()) throw unauthorized("Account temporarily locked. Try again later.");
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED) { user.lockUntil = new Date(Date.now() + LOCK_MS); user.failedLoginAttempts = 0; }
    await user.save();
    throw unauthorized("Invalid credentials");
  }
  user.failedLoginAttempts = 0; user.lockUntil = undefined; await user.save();
  return user;
}

// Issue an OTP for a purpose and persist it (hashed value is fine to keep plain here since short-lived; hash in prod if desired).
export async function setOtp(email: string, purpose: "login" | "verify" | "reset") {
  const user = await User.findOne({ email });
  if (!user) throw badRequest("No account for that email");
  const code = newOtp();
  user.otp = { code, purpose, expiresAt: new Date(Date.now() + 10 * 60_000) };
  await user.save();
  return { user, code };
}
export async function verifyOtp(email: string, code: string, purpose: string) {
  const user = await User.findOne({ email });
  if (!user?.otp?.code || user.otp.purpose !== purpose) throw badRequest("No OTP requested");
  if (user.otp.expiresAt! < new Date()) throw badRequest("OTP expired");
  if (user.otp.code !== code) throw badRequest("Incorrect OTP");
  user.otp = undefined;
  if (purpose === "verify") user.emailVerified = true;
  await user.save();
  return user;
}

export async function listSessions(userId: string) {
  return Session.find({ user: userId, revoked: false }).sort({ lastUsedAt: -1 }).lean();
}
export async function revokeSession(userId: string, sessionId: string) {
  await Session.updateOne({ _id: sessionId, user: userId }, { revoked: true });
}
export async function revokeAllSessions(userId: string, exceptSid?: string) {
  await Session.updateMany({ user: userId, _id: { $ne: exceptSid } }, { revoked: true });
}

export const cookieOpts = {
  httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const,
  domain: env.COOKIE_DOMAIN, path: "/",
};

// ── Two-factor auth (TOTP) ──

export async function setupTwoFactor(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw unauthorized();
  const secret = generateSecret();
  user.twoFactor = { enabled: false, secret };
  await user.save();
  return { secret, otpauthUrl: otpauthURL(user.email, secret) };   // render otpauthUrl as a QR on the client
}
export async function enableTwoFactor(userId: string, code: string) {
  const user = await User.findById(userId);
  if (!user?.twoFactor?.secret) throw badRequest("Start 2FA setup first");
  if (!verifyTotp(code, user.twoFactor.secret)) throw badRequest("Invalid authentication code");
  user.twoFactor.enabled = true;
  await user.save();
}
export async function disableTwoFactor(userId: string, code: string) {
  const user = await User.findById(userId);
  if (!user?.twoFactor?.enabled) return;
  if (!verifyTotp(code, user.twoFactor.secret!)) throw badRequest("Invalid authentication code");
  user.twoFactor = { enabled: false, secret: undefined };
  await user.save();
}
export function checkTwoFactor(user: any, code?: string): boolean {
  if (!user.twoFactor?.enabled) return true;                       // not enrolled → pass
  return Boolean(code && verifyTotp(code, user.twoFactor.secret));
}
