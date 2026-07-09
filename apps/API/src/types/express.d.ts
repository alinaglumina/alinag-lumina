import type { AccessClaims } from "../lib/tokens.js";
declare global {
  namespace Express {
    interface Request { user?: AccessClaims; }
  }
}
export {};
