import { z } from "zod";

// Fail fast if a required secret is missing — never boot half-configured in prod.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  API_ORIGIN: z.string().default("http://localhost:4000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  COOKIE_DOMAIN: z.string().default("localhost"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CALLBACK_URL: z.string().optional().default(""),
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  MAIL_FROM: z.string().default("Alinag Lumina <no-reply@alinaglumina.com>"),
  REDIS_URL: z.string().optional().default(""),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("✖ Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

// Production hardening: refuse to boot with weak or missing critical secrets.
if (isProd) {
  const problems: string[] = [];
  const weak = ["change-me", "dev-only-change-me", "change-me-access-secret", "change-me-refresh-secret"];
  if (weak.some((w) => env.JWT_SECRET.includes(w)) || env.JWT_SECRET.length < 32)
    problems.push("JWT_SECRET must be a strong 32+ char value in production");
  if (weak.some((w) => env.JWT_REFRESH_SECRET.includes(w)) || env.JWT_REFRESH_SECRET.length < 32)
    problems.push("JWT_REFRESH_SECRET must be a strong 32+ char value in production");
  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET)
    problems.push("JWT_SECRET and JWT_REFRESH_SECRET must differ");
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET)
    problems.push("Razorpay keys + webhook secret are required in production");
  if (!env.SMTP_HOST) problems.push("SMTP_HOST is required in production (transactional email)");
  if (env.WEB_ORIGIN.startsWith("http://localhost")) problems.push("WEB_ORIGIN must be your real HTTPS origin");
  if (problems.length) {
    console.error("\u2716 Production config invalid:\n - " + problems.join("\n - "));
    process.exit(1);
  }
}
