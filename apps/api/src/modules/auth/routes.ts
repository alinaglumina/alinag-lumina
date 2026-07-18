import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { asyncHandler, badRequest, unauthorized } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/security.js";
import { hashToken } from "../../lib/tokens.js";
import { env } from "../../config/env.js";
import { User } from "../../models/User.js";
import { enqueueEmail } from "../jobs/index.js";
import { googleAuthUrl, googleExchange, googleConfigured } from "./google.js";
import {
  registerUser, loginUser, issueSession, rotateRefresh, cookieOpts,
  setOtp, verifyOtp, hashPassword, listSessions, revokeSession, revokeAllSessions,
  setupTwoFactor, enableTwoFactor, disableTwoFactor, checkTwoFactor,
} from "./service.js";

const r = Router();
const device = (req: any) => ({ userAgent: req.headers["user-agent"], ip: req.ip, name: req.headers["x-device-name"] });
const setAuthCookies = (res: any, at: string, rt: string) => {
  res.cookie("access_token", at, { ...cookieOpts, maxAge: 15 * 60_000 });
  res.cookie("refresh_token", rt, { ...cookieOpts, maxAge: 30 * 24 * 60 * 60_000 });
};

// Register only creates the account and sends a verification email — no session is issued.
// The user must verify their email, then log in separately.
r.post("/register", authLimiter, validate(z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) })),
  asyncHandler(async (req, res) => {
    const user = await registerUser(req.body.name, req.body.email, req.body.password);
    const token = crypto.randomBytes(32).toString("base64url");
    user.verifyTokenHash = hashToken(token); await user.save();
    await enqueueEmail(user.email, "verifyEmail", { link: `${env.WEB_ORIGIN}/verify-email?token=${token}&uid=${user._id}` });
    await enqueueEmail(user.email, "registration", { name: user.name });
    res.status(201).json({
      message: "Account created. Please check your email to verify your account before signing in.",
      user: { id: user._id, name: user.name, email: user.email },
    });
  }));

r.post("/login", authLimiter, validate(z.object({ email: z.string().email(), password: z.string(), code: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const user = await loginUser(req.body.email, req.body.password);
    if (!user.emailVerified) throw unauthorized("Please verify your email before signing in. Check your inbox for the verification link.");
    if (!checkTwoFactor(user, req.body.code)) return res.json({ twoFactorRequired: true });  // password ok, awaiting TOTP
    const s = await issueSession(String(user._id), user.role, device(req));
    setAuthCookies(res, s.accessToken, s.refreshToken);
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, ...s });
  }));

r.post("/refresh", asyncHandler(async (req, res) => {
  const raw = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!raw) throw badRequest("Missing refresh token");
  const s = await rotateRefresh(raw);
  setAuthCookies(res, s.accessToken, s.refreshToken);
  res.json(s);
}));

r.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  await revokeSession(req.user!.sub, req.user!.sid);
  res.clearCookie("access_token", cookieOpts).clearCookie("refresh_token", cookieOpts).json({ ok: true });
}));

// ── Email verification ──
r.post("/verify-email", validate(z.object({ token: z.string(), uid: z.string() })),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.body.uid);
    if (!user || user.verifyTokenHash !== hashToken(req.body.token)) throw badRequest("Invalid verification link");
    user.emailVerified = true; user.verifyTokenHash = undefined; await user.save();
    res.json({ ok: true });
  }));

// ── Forgot / reset password ──
r.post("/forgot-password", authLimiter, validate(z.object({ email: z.string().email() })),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const token = crypto.randomBytes(32).toString("base64url");
      user.resetTokenHash = hashToken(token);
      user.resetTokenExpiresAt = new Date(Date.now() + 30 * 60_000);
      await user.save();
      await enqueueEmail(user.email, "passwordReset", { link: `${env.WEB_ORIGIN}/reset-password?token=${token}&uid=${user._id}` });
    }
    res.json({ ok: true });   // don't leak whether the email exists
  }));

r.post("/reset-password", validate(z.object({ uid: z.string(), token: z.string(), password: z.string().min(8) })),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.body.uid);
    if (!user || user.resetTokenHash !== hashToken(req.body.token) || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date())
      throw badRequest("Invalid or expired reset link");
    user.passwordHash = await hashPassword(req.body.password);
    user.resetTokenHash = undefined; user.resetTokenExpiresAt = undefined;
    await revokeAllSessions(String(user._id));   // log out everywhere after a reset
    await user.save();
    res.json({ ok: true });
  }));

// ── OTP login (email/SMS) ──
r.post("/otp/request", authLimiter, validate(z.object({ email: z.string().email(), purpose: z.enum(["login", "verify"]).default("login") })),
  asyncHandler(async (req, res) => {
    const { user, code } = await setOtp(req.body.email, req.body.purpose);
    await enqueueEmail(user.email, "otp", { code });   // (SMS provider hook here for phone OTP)
    res.json({ ok: true });
  }));
r.post("/otp/verify", authLimiter, validate(z.object({ email: z.string().email(), code: z.string().length(6), purpose: z.enum(["login", "verify"]).default("login") })),
  asyncHandler(async (req, res) => {
    const user = await verifyOtp(req.body.email, req.body.code, req.body.purpose);
    const s = await issueSession(String(user._id), user.role, device(req));
    setAuthCookies(res, s.accessToken, s.refreshToken);
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, ...s });
  }));

// ── Session / device management ──
r.get("/sessions", requireAuth, asyncHandler(async (req, res) => {
  res.json({ sessions: await listSessions(req.user!.sub), current: req.user!.sid });
}));
r.delete("/sessions/:id", requireAuth, asyncHandler(async (req, res) => {
  await revokeSession(req.user!.sub, req.params.id); res.json({ ok: true });
}));
r.post("/sessions/revoke-others", requireAuth, asyncHandler(async (req, res) => {
  await revokeAllSessions(req.user!.sub, req.user!.sid); res.json({ ok: true });
}));

// ── Two-factor auth (TOTP) ──
r.post("/2fa/setup", requireAuth, asyncHandler(async (req, res) => {
  res.json(await setupTwoFactor(req.user!.sub));   // returns { secret, otpauthUrl } → show as QR
}));
r.post("/2fa/enable", requireAuth, validate(z.object({ code: z.string().length(6) })), asyncHandler(async (req, res) => {
  await enableTwoFactor(req.user!.sub, req.body.code); res.json({ enabled: true });
}));
r.post("/2fa/disable", requireAuth, validate(z.object({ code: z.string().length(6) })), asyncHandler(async (req, res) => {
  await disableTwoFactor(req.user!.sub, req.body.code); res.json({ enabled: false });
}));

// ── Google OAuth ──
r.get("/google", (_req, res) => {
  if (!googleConfigured()) return res.status(501).json({ error: "not_configured", message: "Set GOOGLE_CLIENT_ID/SECRET to enable Google sign-in." });
  res.redirect(googleAuthUrl());
});
r.get("/google/callback", asyncHandler(async (req, res) => {
  const code = String(req.query.code ?? "");
  if (!code) throw badRequest("Missing authorization code");
  const profile = await googleExchange(code);
  let user = await User.findOne({ $or: [{ googleId: profile.googleId }, { email: profile.email }] });
  if (!user) {
    user = await User.create({ name: profile.name, email: profile.email, googleId: profile.googleId, avatar: profile.avatar, emailVerified: true });
  } else if (!user.googleId) {
    user.googleId = profile.googleId; if (!user.avatar) user.avatar = profile.avatar; user.emailVerified = true; await user.save();
  }
  const s = await issueSession(String(user._id), user.role, device(req));
  setAuthCookies(res, s.accessToken, s.refreshToken);
  // Redirect back to the SPA (tokens also set as httpOnly cookies for same-site setups).
  res.redirect(`${env.WEB_ORIGIN}/account`);
}));

export const authRoutes = r;
