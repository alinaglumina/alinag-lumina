import request from "supertest";
import type { Express } from "express";
import { User } from "../../src/models/User.js";
import { Product } from "../../src/models/Product.js";

let seq = 0;
export async function registerUser(app: Express, email: string, name = "User") {
  const r = await request(app).post("/auth/register").send({ name, email, password: "password123" });
  return { token: r.body.accessToken as string, id: r.body.user.id as string, refreshToken: r.body.refreshToken as string };
}
// Create a user with a specific role and return a fresh token that encodes that role.
export async function userWithRole(app: Express, email: string, role: string) {
  await request(app).post("/auth/register").send({ name: role, email, password: "password123" });
  await User.updateOne({ email }, { role });
  const login = await request(app).post("/auth/login").send({ email, password: "password123" });
  return login.body.accessToken as string;
}
export const createProduct = (over: Record<string, any> = {}) =>
  Product.create({ name: "P" + ++seq, slug: "p-" + Date.now() + "-" + seq, price: 1000, stock: 10, gstPercent: 18, status: "active", ...over });
export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
