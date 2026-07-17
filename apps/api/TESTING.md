# Testing — Alinag Lumina API

## Layers
- **Unit tests** (`test/unit/`) — pure business logic, **no database**. Run anywhere, fast.
- **Integration tests** (`test/integration/`) — real Express + Mongoose flows via `supertest`
  against an ephemeral MongoDB.
- **Seed** (`src/scripts/seed.ts`) — starter catalog + admin for manual/dev runs.

## Run
```bash
cd apps/api
npm install

npm test                 # unit suite (14 tests) — no DB needed ✅ proven green
npm run test:integration # integration flows — needs a MongoDB (see below)
npm run test:all         # everything
```

## Unit coverage (proven green in CI-less env)
JWT + refresh hashing, Razorpay checkout & webhook signatures, the coupon discount engine
(percent/cap/fixed/free-ship/BXGY), checkout pricing (shipping tiers + GST extraction), cart merge,
review aggregates, analytics (growth/AOV/conversion/gap-fill), and the RBAC permission matrix.

## Integration coverage (8 files)
- **auth** — register → `/me` → login → refresh; wrong-password rejection.
- **commerce** — cart → checkout (server pricing, free-shipping over ₹999) → `/payments/create`
  → `/payments/verify` (HMAC) → **order paid + inventory reduced**; tampered-signature rejection.
- **admin + reviews** — admin-only product create (403 for customers); review → moderation → aggregate recomputed.
- **coupons** — admin create; validation enforces **min-cart, expiry, global usage limit, and per-user limit**.
- **refunds & cancellation** — admin refund of a paid order → refunded/returned; refund on unpaid order rejected;
  cancel-before-payment → cancelled.
- **wishlist** — guest build/toggle, **share → public link**, unknown shareId 404, **guest→user merge** on login.
- **address CRUD** — create, list, update, set-default (unsets the previous default), delete.
- **inventory** — stock unchanged at checkout, **reduced only after payment**; admin set/delta adjust with negative guard.
- **RBAC** — admin full access; customer denied (403) / unauthenticated (401); **vendor** may manage catalog +
  inventory but not coupons/settings; only a **superadmin** can assign roles.

### Getting a MongoDB for integration tests
The tests default to `mongodb-memory-server`, which downloads a `mongod` binary on first run
(needs outbound access to `fastdl.mongodb.org`). Two options:

1. **In-memory (default):** just run `npm run test:integration` on a machine with internet.
2. **Point at a real Mongo** (offline/CI-restricted, or a disposable Atlas db):
   ```bash
   MONGO_TEST_URI="mongodb+srv://…/lumina_test" npm run test:integration
   ```
   Collections are wiped between tests, so use a throwaway database.

> Note: these integration tests could not be executed inside the build sandbox because the
> MongoDB binary host is network-blocked there (HTTP 403). They are typecheck-clean and run in
> any normal environment or against `MONGO_TEST_URI`.

## Seed
```bash
MONGODB_URI="mongodb+srv://…/lumina" npm run seed
# → admin@alinaglumina.com / admin12345, 3 products, a coupon, banner, CMS page, settings
```
