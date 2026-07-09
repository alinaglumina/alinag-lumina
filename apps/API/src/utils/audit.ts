import type { Request } from "express";
import { AuditLog } from "../models/AuditLog.js";

export async function audit(req: Request, action: string, entity: string, entityId?: string, before?: any, after?: any) {
  await AuditLog.create({
    actor: req.user?.sub, action, entity, entityId, before, after,
    ip: req.ip, userAgent: req.headers["user-agent"],
  });
}
