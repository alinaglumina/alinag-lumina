# Production Readiness Review — Alinag Lumina

Status legend: ✅ done · 🟡 partial / recommended next · 🔴 gap. This review is grounded in the
current codebase; items marked ✅ were verified in code, and several gaps were fixed as part of it.

## 1. Security hardening — 🟡→✅ (hardened)
**In place:** Helmet, CORS locked to `WEB_ORIGIN` (credentials), compression, HPP, `express-mongo-sanitize`,
XSS input cleaning, Zod validation on every route, global + auth-specific rate limiters, argon2 password
hashing, access+rotating-refresh JWTs (refresh stored hashed, one-time use), account lockout, per-module RBAC,
secrets read via validated env, generic error responses (no stack/PII leakage), `trust proxy` for real IPs.
**Fixed in this review:** production env guard now **refuses to boot** with weak/placeholder JWT secrets,
identical access/refresh secrets, missing Razorpay/SMTP config, or a localhost `WEB_ORIGIN`.
**Recommended next:** tighten Helmet CSP for the web app; add per-user (not just per-IP) rate limits on
sensitive auth routes; optional TOTP 2FA (fields already modeled); secret manager (AWS/GCP/Vault) over `.env`;
dependency scanning (`npm audit` / Dependabot) in CI.

## 2. Performance optimization — 🟡
**In place:** background job queue (BullMQ+Redis) so email/notifications don't block requests; gzip
compression; Next.js SSR + `next/image` + automatic code-splitting; standalone Docker output; DB pagination
everywhere; lean projections on list endpoints.
**Recommended next:** add a **Redis response cache** for hot reads (product lists/detail, CMS, banners) with
tag-based invalidation on writes; enable Mongo connection pooling tuning; CDN in front of the web app and
Cloudinary for media; `Cache-Control`/ETag headers on public GETs; run k6/Artillery load tests before launch.

## 3. API documentation — 🔴→✅ (added)
**Added in this review:** an **OpenAPI 3 spec** (`src/docs/openapi.ts`) served as **Swagger UI at `/docs`**
and raw JSON at `/openapi.json`, covering auth, products, cart, wishlist, coupons, checkout, payments,
account, notifications, tracking, content, and representative admin routes, with security schemes
(bearer + guest session) and shared schemas.
**Recommended next:** generate the spec from Zod schemas (e.g. `zod-to-openapi`) so it can't drift from the
validators; publish a Postman collection.

## 4. Database indexing & optimization — 🟡→✅ (indexed)
**In place:** unique indexes (email, slugs, coupon code, provider order id), text search index on products,
Session TTL index, Review `product+user` uniqueness.
**Added in this review:** compound indexes on the hot paths — `Order(user, createdAt)`,
`Order(payment.status, createdAt)`, `Order(shipment.awb)`, `Order(coupon.code, payment.status)`,
`Notification(user, read, createdAt)`, `Review(product, status)`, `Review(status, createdAt)`,
`AuditLog(action, createdAt)`, `AuditLog(entity, entityId)`, `Cart(updatedAt)`.
**Recommended next:** disable `autoIndex` in production (build indexes via a migration) — the DB config
already gates it by env; profile slow queries with Atlas Performance Advisor; add TTL on stale guest carts.

## 5. Backup & recovery — 🟡 (documented)
**Strategy:** on **MongoDB Atlas**, enable Cloud Backups with continuous **point-in-time recovery** (retain
7–30 days) and cross-region snapshot copies; test a restore quarterly. Self-hosted: nightly `mongodump` to
object storage (S3/GCS) with lifecycle expiry, plus PITR via oplog. Keep **infra as code** (compose/nginx/pm2
in repo) so the app tier is reproducible. Document RPO/RTO targets (e.g. RPO ≤ 5 min with PITR, RTO ≤ 1 hr).
**Recommended next:** add a `scripts/backup.sh` + cron unit and a documented restore runbook.

## 6. Logging & monitoring — 🟡→✅ (improved)
**In place:** structured **pino** logging (JSON in prod, pretty in dev, silent in test); pino-http request
logging; `/health` (liveness) and `/ready` (readiness: Mongo + job broker) probes; full **audit trail** on
every privileged mutation with a queryable admin viewer.
**Added in this review:** **request-ID correlation** — every request gets/propagates an `x-request-id` header,
logged with each line for tracing.
**Recommended next:** ship logs to a store (Loki/Datadog/CloudWatch); error tracking (Sentry); metrics
(prom-client + `/metrics` → Prometheus/Grafana) for latency, queue depth, payment success rate; uptime alerts.

## 7. Environment configuration — 🟡→✅ (validated)
**In place:** all config via **Zod-validated env** (`config/env.ts`) that fails fast on malformed values;
`.env.example` enumerates every secret; secrets never logged; per-environment `NODE_ENV`.
**Fixed in this review:** the production guard (see §1) enforces strong, distinct secrets and required
prod services before the process starts.
**Recommended next:** move secrets to a managed secret store; separate `.env` per environment in CI;
rotate JWT/webhook secrets on a schedule.

## 8. Deployment automation — 🟡
**In place:** **CI** (GitHub Actions) runs lint, typecheck, unit, integration (mongo service), build, and
Playwright e2e, gated by a `ci-success` check; **Docker/Compose**, **PM2** (cluster), and **Nginx** (TLS-ready)
configs; Next standalone image; seed script.
**Recommended next:** a **CD** workflow (build+push images on tag → deploy via SSH/registry with health-gated
rollout and rollback); DB index/migration step in the deploy; blue-green or rolling restarts; smoke test the
`/ready` probe post-deploy before shifting traffic.

## Launch gate (must be green before go-live)
CI green on `main` · integration suite run against a real DB · one Razorpay **test-key** payment end-to-end ·
one Google-OAuth round trip · `docker compose up` builds and serves · Atlas backups + PITR enabled ·
HTTPS + HSTS via certbot · production env guard passes with real secrets · logs + error tracking shipping.
