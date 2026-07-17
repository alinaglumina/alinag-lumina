import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env.js";

export const googleConfigured = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
const client = () => new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL);

// Consent URL to redirect the user to.
export function googleAuthUrl(state?: string) {
  return client().generateAuthUrl({ scope: ["openid", "email", "profile"], access_type: "offline", prompt: "consent", state });
}

// Exchange the callback code → verified profile.
export async function googleExchange(code: string) {
  const c = client();
  const { tokens } = await c.getToken(code);
  const ticket = await c.verifyIdToken({ idToken: tokens.id_token!, audience: env.GOOGLE_CLIENT_ID });
  const p = ticket.getPayload();
  if (!p?.email) throw new Error("Google account has no email");
  return { googleId: p.sub, email: p.email, name: p.name ?? p.email, avatar: p.picture };
}
