import { describe, it, expect } from "vitest";
import { buildApp } from "../../src/server.js";
import request from "supertest";
import { setupTestDB } from "../setup/db.js";
import { registerUser, createProduct, bearer } from "../setup/helpers.js";

const app = buildApp();
setupTestDB();

describe("wishlist sharing & guest→user merge (integration)", () => {
  it("guest can build, share, and merge a wishlist on login", async () => {
    const p1 = await createProduct(); const p2 = await createProduct();
    const sid = "guest_sess_123";

    // guest toggles two products
    await request(app).post("/wishlist/toggle").set("x-session-id", sid).send({ productId: String(p1._id) });
    await request(app).post("/wishlist/toggle").set("x-session-id", sid).send({ productId: String(p2._id) });
    const guestView = await request(app).get("/wishlist").set("x-session-id", sid);
    expect(guestView.body.products.length).toBe(2);

    // toggle again removes one
    await request(app).post("/wishlist/toggle").set("x-session-id", sid).send({ productId: String(p2._id) });
    const after = await request(app).get("/wishlist").set("x-session-id", sid);
    expect(after.body.products.length).toBe(1);

    // share → public link works, unknown shareId 404s
    const share = await request(app).post("/wishlist/share").set("x-session-id", sid);
    expect(share.body.shareId).toBeTruthy();
    const shared = await request(app).get(`/wishlist/shared/${share.body.shareId}`);
    expect(shared.status).toBe(200);
    expect(shared.body.products.length).toBe(1);
    expect((await request(app).get("/wishlist/shared/nope")).status).toBe(404);

    // merge into a fresh user on login
    const { token } = await registerUser(app, "wl@t.com");
    const merged = await request(app).post("/wishlist/merge").set(bearer(token)).send({ sessionId: sid });
    expect(merged.body.products.length).toBe(1);
  });
});

describe("address CRUD (integration)", () => {
  it("create, list, update, set-default, delete", async () => {
    const { token } = await registerUser(app, "addr@t.com");
    const a = { name: "Home", phone: "999", line1: "1 St", city: "Anantapur", state: "AP", pincode: "515001", isDefault: true };

    const created = await request(app).post("/me/addresses").set(bearer(token)).send(a);
    expect(created.status).toBe(201);
    expect(created.body.addresses.length).toBe(1);
    const id1 = created.body.addresses[0]._id;

    // add a second default → first should lose default
    const created2 = await request(app).post("/me/addresses").set(bearer(token))
      .send({ ...a, name: "Office", isDefault: true });
    const addrs = created2.body.addresses;
    expect(addrs.length).toBe(2);
    expect(addrs.find((x: any) => x._id === id1).isDefault).toBe(false);

    // update the first
    const updated = await request(app).put(`/me/addresses/${id1}`).set(bearer(token)).send({ city: "Bengaluru" });
    expect(updated.body.addresses.find((x: any) => x._id === id1).city).toBe("Bengaluru");

    // list
    const list = await request(app).get("/me/addresses").set(bearer(token));
    expect(list.body.addresses.length).toBe(2);

    // delete the first
    const del = await request(app).delete(`/me/addresses/${id1}`).set(bearer(token));
    expect(del.body.addresses.length).toBe(1);
  });
});
