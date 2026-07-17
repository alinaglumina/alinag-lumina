import { Router } from "express";
import { z } from "zod";
import { asyncHandler, notFound } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireRole } from "../../middleware/auth.js";
import { User } from "../../models/User.js";
import { PERMISSIONS, ROLES } from "../../lib/permissions.js";
import { audit } from "../../utils/audit.js";

const r = Router();

// The role → permission matrix (drives admin UI gating).
r.get("/", asyncHandler(async (_req, res) => res.json({ roles: ROLES, permissions: PERMISSIONS })));

// Staff directory (non-customer accounts).
r.get("/users", asyncHandler(async (_req, res) => {
  const staff = await User.find({ role: { $in: ["staff", "admin", "superadmin"] } }).select("name email role status").sort("role").lean();
  res.json({ staff });
}));

// Change a user's role — superadmin only.
r.patch("/users/:id", requireRole("superadmin"), validate(z.object({ role: z.enum(["customer", "vendor", "staff", "admin", "superadmin"]) })),
  asyncHandler(async (req, res) => {
    const before = await User.findById(req.params.id).select("role").lean();
    if (!before) throw notFound("User not found");
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select("name email role");
    await audit(req, "roles.assign", "User", req.params.id, { role: before.role }, { role: req.body.role });
    res.json({ user });
  }));

export const adminRoleRoutes = r;
