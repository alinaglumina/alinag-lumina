import { createQueue } from "../../lib/queue.js";
import { deliverMail, type templates } from "../../utils/email.js";
import { sendSms, sendPush } from "../../utils/dispatch.js";
import { User } from "../../models/User.js";

// ── Email queue ──
export interface EmailJob { to: string; tpl: keyof typeof templates; data: any; }
const emailQueue = createQueue<EmailJob>("email", ({ to, tpl, data }) => deliverMail(to, tpl, data));
export const enqueueEmail = (to: string, tpl: EmailJob["tpl"], data: any = {}) => emailQueue.add({ to, tpl, data });

// ── Notification fan-out queue (resolves contact, dispatches side-channels) ──
export interface NotifyFanoutJob {
  user?: string; channels: ("inapp" | "email" | "sms" | "push")[];
  title: string; body: string; emailTemplate?: keyof typeof templates; emailData?: any;
}
const notificationQueue = createQueue<NotifyFanoutJob>("notification", async (j) => {
  if (!j.user) return;
  const user = await User.findById(j.user).select("email phone").lean();
  if (j.channels.includes("email") && user?.email && j.emailTemplate) await deliverMail(user.email, j.emailTemplate, j.emailData ?? {});
  if (j.channels.includes("sms") && user?.phone) await sendSms(user.phone, j.body);
  if (j.channels.includes("push")) await sendPush(j.user, j.title, j.body);
});
export const enqueueNotification = (job: NotifyFanoutJob) => notificationQueue.add(job);
