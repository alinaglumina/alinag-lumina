import { Router } from "express";
import { asyncHandler } from "../../lib/http.js";
import { requireAuth } from "../../middleware/auth.js";
import { listForUser, unreadCount, markRead, markAllRead } from "./service.js";

const r = Router();
r.get("/me/notifications", requireAuth, asyncHandler(async (req, res) => {
  res.json({ items: await listForUser(req.user!.sub, req.query.unread === "true"), unread: await unreadCount(req.user!.sub) });
}));
r.get("/me/notifications/unread-count", requireAuth, asyncHandler(async (req, res) => res.json({ unread: await unreadCount(req.user!.sub) })));
r.patch("/me/notifications/:id/read", requireAuth, asyncHandler(async (req, res) => { await markRead(req.user!.sub, req.params.id); res.json({ ok: true }); }));
r.post("/me/notifications/read-all", requireAuth, asyncHandler(async (req, res) => { await markAllRead(req.user!.sub); res.json({ ok: true }); }));
export const notificationRoutes = r;
