import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST, port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    })
  : null;

// Named templates → subject + html. Extend as needed.
export const templates = {
  registration: (o: any) => ({ subject: "Welcome to Alinag Lumina", html: `<h2>Welcome, ${o.name}!</h2><p>Your account is ready.</p>` }),
  otp: (o: any) => ({ subject: "Your Lumina OTP", html: `<p>Your one-time code is <b style="font-size:20px">${o.code}</b>. It expires in 10 minutes.</p>` }),
  verifyEmail: (o: any) => ({ subject: "Verify your email", html: `<p>Confirm your email:</p><p><a href="${o.link}">Verify email</a></p>` }),
  passwordReset: (o: any) => ({ subject: "Reset your password", html: `<p>Reset link (valid 30 min):</p><p><a href="${o.link}">Reset password</a></p>` }),
  orderConfirmation: (o: any) => ({ subject: `Order ${o.orderNo} confirmed`, html: `<p>Thanks! We've received order <b>${o.orderNo}</b> (₹${o.total}).</p>` }),
  shippingUpdate: (o: any) => ({ subject: `Order ${o.orderNo} shipped`, html: `<p>Your order is on the way. Track: <a href="${o.trackingUrl}">here</a>.</p>` }),
  deliveryConfirmation: (o: any) => ({ subject: `Order ${o.orderNo} delivered`, html: `<p>Delivered! We hope you love it.</p>` }),
  refund: (o: any) => ({ subject: `Refund for ${o.orderNo}`, html: `<p>₹${o.amount} has been refunded to your original payment method.</p>` }),
} as const;

export async function deliverMail(to: string, tpl: keyof typeof templates, data: any) {
  const { subject, html } = templates[tpl](data);
  if (!transporter) { logger.info({ to, subject }, "[email stub] SMTP not configured — logged only"); return; }
  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html });
}
