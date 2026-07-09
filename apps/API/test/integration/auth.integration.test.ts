import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../../src/server.js";
import { setupTestDB } from "../setup/db.js";

const app = buildApp();
setupTestDB();

describe("auth flow (integration)", () => {
  it("register → me → login → refresh", async () => {
    const reg = await request(app).post("/auth/register").send({ name: "Alice", email: "alice@test.com", password: "password123" });
    expect(reg.status).toBe(201);
    expect(reg.body.accessToken).toBeTruthy();

    const me = await request(app).get("/me").set("Authorization", `Bearer ${reg.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("alice@test.com");

    const login = await request(app).post("/auth/login").send({ email: "alice@test.com", password: "password123" });
    expect(login.status).toBe(200);

    const refresh = await request(app).post("/auth/refresh").send({ refreshToken: login.body.refreshToken });
    expect(refresh.status).toBe(200);
    expect(refresh.body.accessToken).toBeTruthy();
  });

  it("rejects wrong password", async () => {
    await request(app).post("/auth/register").send({ name: "Bob", email: "bob@test.com", password: "password123" });
    const bad = await request(app).post("/auth/login").send({ email: "bob@test.com", password: "wrongpass" });
    expect(bad.status).toBe(401);
  });
});
