import { Notification } from "../../models/Notification.js";
import type { templates } from "../../utils/email.js";
import { enqueueNotification } from "../jobs/index.js";

export interface NotifyInput {
  user?: string; audience?: "user" | "admin";
  channels?: ("inapp" | "email" | "sms" | "push")[];
  type: string; title: string; body: string; data?: any;
  emailTemplate?: keyof typeof templates; emailData?: any;
}

// Records the in-app notification synchronously (so the inbox reflects it immediately),
// then hands email/SMS/push off to the background queue.
export async function notify(input: NotifyInput) {
  const channels = input.channels ?? ["inapp"];
  const primary = channels.find((c) => c !== "inapp") ?? "inapp";
  const doc = await Notification.create({
    user: input.user, audience: input.audience ?? "user", channel: primary,
    type: input.type, title: input.title, body: input.body, data: input.data,
  });
  if (input.user && channels.some((c) => c !== "inapp")) {
    await enqueueNotification({ user: input.user, channels, title: input.title, body: input.body, emailTemplate: input.emailTemplate, emailData: input.emailData });
  }
  return doc;
}

export const listForUser = (userId: string, unreadOnly = false) =>
  Notification.find({ user: userId, ...(unreadOnly && { read: false }) }).sort("-createdAt").limit(50).lean();
export const unreadCount = (userId: string) => Notification.countDocuments({ user: userId, read: false });
export const markRead = (userId: string, id: string) => Notification.updateOne({ _id: id, user: userId }, { read: true });
export const markAllRead = (userId: string) => Notification.updateMany({ user: userId, read: false }, { read: true });
