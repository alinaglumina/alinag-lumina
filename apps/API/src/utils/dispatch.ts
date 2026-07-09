import { logger } from "../lib/logger.js";
// SMS + push are stubbed (log only) until a provider is configured. Wire Twilio/MSG91 (SMS)
// and FCM (push) here; they read SMS_PROVIDER_KEY / FCM_SERVER_KEY from env.
export async function sendSms(to: string, body: string) {
  logger.info({ to, body }, "[sms stub] would send SMS");
}
export async function sendPush(userId: string, title: string, body: string) {
  logger.info({ userId, title, body }, "[push stub] would send push");
}
