import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../../src/server.js";
import { setupTestDB } from "../setup/db.js";
import { User } from "../../src/models/User.js";
import { Product } from "../../src/models/Product.js";
import { Review } from "../../src/models/Review.js";

const app = buildApp();
setupTestDB();

async function adminToken() {
  await request(app).post("/auth/register").send({ name: "Adm", email: "adm@test.com", password: "password123" });
  await User.updateOne({ email: "adm@test.com" }, { role: "admin" });
  return (await request(app).post("/auth/login").send({ email: "adm@test.com", password: "password123" })).body.accessToken;
}

describe("admin + reviews (integration)", () => {
  it("admin can create a product; customer can't", async () => {
    const admin = await adminToken();
    const created = await request(app).post("/admin/products").set("Authorization", `Bearer ${admin}`).send({ name: "Kurti", price: 649 });
    expect(created.status).toBe(201);
    expect(created.body.product.slug).toBe("kurti");

    const cust = (await request(app).post("/auth/register").send({ name: "C", email: "c@test.com", password: "password123" })).body.accessToken;
    const denied = await request(app).post("/admin/products").set("Authorization", `Bearer ${cust}`).send({ name: "X", price: 1 });
    expect(denied.status).toBe(403);
  });

  it("review moderation updates the product aggregate", async () => {
    const admin = await adminToken();
    const p = await Product.create({ name: "Bag", slug: "bag", price: 1000, status: "active" });
    const cust = (await request(app).post("/auth/register").send({ name: "R", email: "r@test.com", password: "password123" })).body.accessToken;

    await request(app).post("/reviews").set("Authorization", `Bearer ${cust}`).send({ product: String(p._id), rating: 4, title: "Nice" });
    const review = await Review.findOne({ product: p._id });
    expect(review!.status).toBe("pending");                       // enters moderation

    await request(app).patch(`/admin/reviews/${review!._id}/moderate`).set("Authorization", `Bearer ${admin}`).send({ status: "approved" });
    const fresh = await Product.findById(p._id);
    expect(fresh!.ratings!.count).toBe(1);
    expect(fresh!.ratings!.average).toBe(4);                       // aggregate recomputed
  });
});
