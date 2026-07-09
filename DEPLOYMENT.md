# Deployment — Alinag Lumina

Two supported paths: **Docker Compose** (simplest) or **PM2 + Nginx** on a bare Ubuntu VPS.
Either way, secrets come from `.env` (never commit it) — see `.env.example`.

## Option A — Docker Compose (recommended)
```bash
cp .env.example .env            # fill secrets (JWT, Razorpay, SMTP, Cloudinary, Google)
docker compose up --build -d    # mongo + redis + api + web
docker compose exec api node dist/scripts/seed.js   # optional: seed catalog + admin
```
- Web → http://localhost:3000, API → http://localhost:4000.
- In production, use **MongoDB Atlas** instead of the bundled mongo: set `MONGODB_URI` in `.env`
  and remove the `mongo` service (or leave it for local only).

## Option B — Ubuntu VPS with PM2 + Nginx
```bash
# 1. System
sudo apt update && sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2

# 2. App
git clone <repo> /var/www/lumina && cd /var/www/lumina
cp .env.example .env   # edit
npm ci
npm run build          # builds api (dist) + web (.next)
npm run seed           # optional

# 3. Process manager
pm2 start deploy/ecosystem.config.cjs
pm2 save && pm2 startup     # survive reboots

# 4. Reverse proxy + TLS
sudo cp deploy/nginx.conf /etc/nginx/sites-available/alinaglumina
sudo ln -s /etc/nginx/sites-available/alinaglumina /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d alinaglumina.com -d www.alinaglumina.com   # auto-configures SSL + renewal

# 5. Firewall
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

## Go-Live checklist
**Infrastructure:** Ubuntu configured · domain + DNS A records · SSL via certbot (auto-renew) ·
UFW firewall (SSH + Nginx Full only) · Nginx reverse proxy (`deploy/nginx.conf`) · PM2 (cluster) or
Docker `restart: unless-stopped` · **automated Atlas backups** (enable in Atlas UI).
**Backend:** Atlas connected · JWT + refresh rotation · Google OAuth callback URL registered ·
rate limiting on · pino logging (ship to a log service) · audit logs.
**Frontend:** responsive · next/image optimization · lazy loading · full SEO metadata · sitemap + robots.
**Payments:** Razorpay **live** keys after testing · webhook URL `https://alinaglumina.com/api/payments/webhook`
(events: payment.captured, payment.failed) · refund workflow tested.
**Security:** HTTPS enforced (HSTS) · Helmet · input validation + sanitization + XSS · CORS locked to
`WEB_ORIGIN` · account lockout · `trust proxy` set for correct client IPs.
**Business:** GST + HSN configured · legal pages published (CMS) · shipping/return/refund policies ·
contact + email support (SMTP) · analytics.

## Notes
- Point `WEB_ORIGIN`, `API_ORIGIN`, `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_SITE_URL`, `COOKIE_DOMAIN`,
  and Google's `GOOGLE_CALLBACK_URL` at your real domain.
- The API trusts one proxy hop (`trust proxy = 1`) so rate-limits and audit logs see real client IPs.
- Swap the logistics + SMS/push stubs for live providers (Shiprocket / Twilio-MSG91 / FCM) via env.
