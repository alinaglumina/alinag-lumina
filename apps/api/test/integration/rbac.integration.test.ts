import { describe, it, expect } from "vitest";
import { buildApp } from "../../src/server.js";
import request from "supertest";
import { setupTestDB } from "../setup/db.js";
import { registerUser, userWithRole, createProduct, bearer } from "../setup/helpers.js";

const app = buildApp();
setupTestDB();

describe("role-based access control (integration)", () => {
  it("admin has full access; customer is denied admin routes", async () => {
    const admin = await userWithRole(app, "a@t.com", "admin");
    const { token: customer } = await registerUser(app, "c@t.com");

    expect((await request(app).post("/admin/products").set(bearer(admin)).send({ name: "Dress", price: 999 })).status).toBe(201);
    expect((await request(app).get("/admin/settings").set(bearer(admin))).status).toBe(200);

    expect((await request(app).post("/admin/products").set(bearer(customer)).send({ name: "X", price: 1 })).status).toBe(403);
    expect((await request(app).get("/admin/dashboard").set(bearer(customer))).status).toBe(403);
    expect((await request(app).get("/admin/products")).status).toBe(401); // unauthenticated
  });

  it("vendor can manage catalog + inventory but not admin-only modules", async () => {
    const vendor = await userWithRole(app, "v@t.com", "vendor");
    const p = await createProduct({ stock: 5 });

    // allowed: products + inventory
    expect((await request(app).post("/admin/products").set(bearer(vendor)).send({ name: "Cap", price: 500 })).status).toBe(201);
    expect((await request(app).patch(`/admin/inventory/${p._id}`).set(bearer(vendor)).send({ set: 20 })).status).toBe(200);

    // denied: coupons, settings, roles (admin-only)
    expect((await request(app).post("/admin/coupons").set(bearer(vendor)).send({ code: "X10", type: "percent", value: 10 })).status).toBe(403);
    expect((await request(app).get("/admin/settings").set(bearer(vendor))).status).toBe(403);
  });

  it("only a superadmin can assign roles", async () => {
    const superadmin = await userWithRole(app, "su@t.com", "superadmin");
    const admin = await userWithRole(app, "adm@t.com", "admin");
    const { id: targetId } = await registerUser(app, "target@t.com");

    // admin cannot promote
    expect((await request(app).patch(`/admin/roles/users/${targetId}`).set(bearer(admin)).send({ role: "vendor" })).status).toBe(403);
    // superadmin can
    const ok = await request(app).patch(`/admin/roles/users/${targetId}`).set(bearer(superadmin)).send({ role: "vendor" });
    expect(ok.status).toBe(200);
    expect(ok.body.user.role).toBe("vendor");
  });
});
