import { authenticator } from "otplib";
// TOTP (RFC 6238) helpers for optional two-factor auth. Works with any authenticator app.
export const generateSecret = () => authenticator.generateSecret();
export const otpauthURL = (account: string, secret: string) => authenticator.keyuri(account, "Alinag Lumina", secret);
export const verifyTotp = (token: string, secret: string) => {
  try { return authenticator.verify({ token, secret }); } catch { return false; }
};
