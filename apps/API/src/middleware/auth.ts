import type { Request, Response, NextFunction } from "express";
import { verifyAccess } from "../lib/tokens.js";
import { unauthorized, forbidden } from "../lib/http.js";

// Reads the access token from the Authorization header or an httpOnly cookie.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.replace(/^Bearer /, "");
  const token = bearer || req.cookies?.access_token;
  if (!token) return next(unauthorized("Missing access token"));
  try {
    req.user = verifyAccess(token);
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

// Role gate — use after requireAuth. Roles: customer | staff | admin | superadmin.
export const requireRole =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden("Insufficient role"));
    next();
  };

// Optional auth — populates req.user when a valid token is present, but never rejects.
// Used by cart/wishlist so guests (via x-session-id) and users share the same routes.
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.replace(/^Bearer /, "");
  const token = bearer || req.cookies?.access_token;
  if (token) { try { req.user = verifyAccess(token); } catch { /* ignore */ } }
  next();
}
