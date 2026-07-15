# Deploying ServiceFox

One Next.js app serves everything — the landing page, your `/admin` console,
and every tenant's branded portal on a wildcard subdomain. Deploying means:
one app host, one Postgres database, one wildcard DNS record, and (when you're
ready to charge) four Stripe settings.

**Pick one path:**

| Option | Best for | Effort |
|---|---|---|
| [A. Vercel + Neon](#option-a-vercel--neon-recommended) | Lowest ops, scales automatically | ~30 min |
| [B. Railway](#option-b-railway) | App + database in one dashboard | ~30 min |
| [C. Docker on a VPS](#option-c-docker-on-a-vps) | Full control, flat monthly cost | ~1–2 hrs |

All three start with the same two steps below.

---

## Step 1 — Switch the database to Postgres

Local dev uses SQLite; production must use Postgres (SQLite doesn't survive
redeploys on serverless hosts and doesn't handle concurrent writers well).
The schema was written to be Postgres-compatible from day one — the switch is
one line.

In [prisma/schema.prisma](prisma/schema.prisma):

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

Commit that change. (To keep developing locally afterwards, either run local
Postgres via Docker, or temporarily flip the provider back — don't commit the
flip.)

## Step 2 — Push the code to GitHub

The repo lives at **github.com/MyCloudable/CoreFlow** and `origin` is already
configured — after committing the provider switch, just:

```bash
git push
```

---

## Option A: Vercel + Neon (recommended)

### A1. Create the database (Neon)

1. Create a project at [neon.tech](https://neon.tech) (free tier is fine to start).
2. Neon shows **two** connection strings — you need both, for different jobs:
   - **Direct** (no `-pooler` in the host) → used once, below, for schema
     push and admin creation. Prisma's schema commands need a direct
     connection; against the pooler they can fail with opaque errors.
   - **Pooled** (`…-pooler.REGION…`) → used as `DATABASE_URL` on Vercel in A3.

### A2. Push the schema and create your admin (from your machine)

Use the **direct** connection string here:

```powershell
# PowerShell (Windows)
$env:DATABASE_URL = "postgresql://...the DIRECT Neon URL..."
npx prisma db push
npm run create-admin -- admin@yourdomain.com "a-strong-password" "Your Name"
```

```bash
# bash/zsh (macOS/Linux)
DATABASE_URL="postgresql://...direct..." npx prisma db push
DATABASE_URL="postgresql://...direct..." npm run create-admin -- admin@yourdomain.com "a-strong-password" "Your Name"
```

Do **not** run `npm run db:seed` against production — that's demo data.

### A3. Deploy the app (Vercel)

1. [vercel.com](https://vercel.com) → **Add New → Project** → import your GitHub repo.
   Vercel auto-detects Next.js; the build command (`npm run build`) already runs
   `prisma generate`.
2. Before the first deploy, add **Environment Variables**:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your Neon **pooled** connection string |
   | `ROOT_DOMAIN` | `yourdomain.com` — bare apex: no `https://`, no trailing slash, **never `www.`** |
   | `STRIPE_SECRET_KEY` | leave unset until you do the [Stripe section](#stripe-going-live) |
   | `STRIPE_WEBHOOK_SECRET` | 〃 |
   | `STRIPE_PRICE_BASE` | 〃 |
   | `STRIPE_PRICE_SEAT` | 〃 |

3. Deploy.

### A4. Domains (the wildcard is the important part)

In the Vercel project → **Settings → Domains**, add **both**:

- `yourdomain.com` (the landing page + `/admin`)
- `*.yourdomain.com` (every tenant portal)

> **Wildcard requirement:** Vercel only issues wildcard certificates when your
> domain uses **Vercel's nameservers**. Vercel shows you the two nameservers to
> set at your registrar. If you can't move nameservers, use Option B or C, or
> add tenant subdomains to Vercel one-by-one (workable for your first few
> tenants, not at scale).

After DNS propagates, verify:

- `https://yourdomain.com` → landing page
- `https://www.yourdomain.com` → landing page (`www` is automatically treated
  as the root site, never as a tenant)
- `https://yourdomain.com/admin` → your admin login (use the credentials from A2)
- `https://anything.yourdomain.com` → 404 (no such tenant yet — expected)

### A5. First tenant

In `/admin`, create a tenant (name + subdomain + owner login). Their portal is
live immediately at `slug.yourdomain.com` with a 14-day trial running.

---

## Option B: Railway

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
2. In the same project, **Add service → Database → PostgreSQL**.
3. On the app service → **Variables**: set `DATABASE_URL` to the Postgres
   service's connection string (Railway offers it as a reference variable),
   plus `ROOT_DOMAIN=yourdomain.com` and the Stripe vars when ready.
4. Push the schema & create your admin from your machine exactly as in
   [A2](#a2-push-the-schema-and-create-your-admin-from-your-machine), using the
   database's **public** connection string.
5. **Settings → Networking → Custom Domain**: add `yourdomain.com` and
   `*.yourdomain.com`, then create the CNAME records Railway shows you at your
   DNS provider (a wildcard CNAME `*` → your Railway target). Railway issues
   certificates for both.
6. Create your first tenant from `/admin`.

---

## Option C: Docker on a VPS

Uses the included [Dockerfile](Dockerfile) and
[docker-compose.yml](docker-compose.yml) (app + Postgres). Requires any VPS
with Docker installed.

```bash
git clone https://github.com/MyCloudable/CoreFlow.git && cd CoreFlow
npm ci   # needed on the host for the one-time bootstrap commands below
# 1. Make sure Step 1 (postgresql provider) is committed.
# 2. Configure:
export POSTGRES_PASSWORD="something-long-and-random"
export ROOT_DOMAIN="yourdomain.com"
# 3. Build and start:
docker compose up -d --build
# 4. One-time: push schema + create admin (compose maps Postgres to localhost):
DATABASE_URL="postgresql://portal:$POSTGRES_PASSWORD@localhost:5432/portal" npx prisma db push
DATABASE_URL="postgresql://portal:$POSTGRES_PASSWORD@localhost:5432/portal" npm run create-admin -- admin@yourdomain.com "a-strong-password"
```

The app listens on port 3000. Put a reverse proxy with **wildcard TLS** in
front. Caddy is the least-effort option — wildcard certificates require a DNS
challenge, so use a Caddy build with your DNS provider's plugin (e.g.
Cloudflare) and an API token:

```caddyfile
yourdomain.com, *.yourdomain.com {
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }
    reverse_proxy localhost:3000
}
```

DNS: an `A` record for `yourdomain.com` → your server IP, and an `A` (or
CNAME) record for `*` → the same IP.

**Backups:** `pg_dump` on a cron, e.g.
`docker compose exec db pg_dump -U portal portal > backup-$(date +%F).sql`.

---

## Stripe: going live

Billing is dormant until **all four** env vars are set (that's deliberate —
`stripeEnabled()` requires the webhook secret too, so you can't accidentally
take payments without status sync). Until then, run tenants manually: set
their status from `/admin` and invoice however you like.

1. **Product & prices** (Stripe Dashboard → Product catalog → Add product):
   - Product "ServiceFox" with **two recurring monthly prices**:
     - a flat **$99.00/month** price → its ID is `STRIPE_PRICE_BASE`
     - a **$5.00/month per unit** price → its ID is `STRIPE_PRICE_SEAT`
2. **Webhook** (Dashboard → Developers → Webhooks → Add endpoint):
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`
3. Set the four env vars on your host and redeploy.
4. **Test the loop** (Stripe test mode keys first): create a test tenant, log
   in as its owner → Billing → **Set up billing** → pay with card
   `4242 4242 4242 4242`. The page confirms immediately (it reconciles on
   return, not just via webhook); `/admin` shows the tenant progressing
   TRIAL → ACTIVE when the trial ends.

How the trial interacts with checkout: if the tenant subscribes with **more
than 48 hours** of trial left, the card is saved and billing starts when the
trial ends; with less than 48 hours left, billing starts at checkout (the
billing page tells the owner which case they're in). Seat counts sync to the
subscription automatically whenever team members are added or deactivated.

Local webhook testing:
`stripe listen --forward-to localhost:3000/api/stripe/webhook`

---

## Environment variables (reference)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres in production; SQLite path in dev |
| `ROOT_DOMAIN` | yes | e.g. `yourdomain.com` — **bare apex host only**, no protocol, never `www.` (setting `www.yourdomain.com` silently breaks all tenant routing). Include `:port` only for non-standard ports. Subdomain routing and portal URLs derive from it; `www.<ROOT_DOMAIN>` is served as the root site automatically. |
| `STRIPE_SECRET_KEY` | for billing | `sk_live_…` (or `sk_test_…` while testing) |
| `STRIPE_WEBHOOK_SECRET` | for billing | `whsec_…` from your webhook endpoint |
| `STRIPE_PRICE_BASE` | for billing | `price_…` of the $99/mo flat price |
| `STRIPE_PRICE_SEAT` | for billing | `price_…` of the $5/mo per-unit price |

## Post-deploy smoke test

1. `https://yourdomain.com/api/health` → `{"ok":true}`
2. `https://unknownsub.yourdomain.com` → 404 (proves wildcard routing works —
   do this on Railway/Docker too, not just Vercel).
3. `/admin` login works; create a test tenant.
4. `testtenant.yourdomain.com` shows its branded login; owner can sign in,
   sees the trial banner.
5. Owner creates a client company + client login; client sees an empty, scoped
   dashboard.
6. Owner adds a technician; tech login lands on the mobile field portal.
7. (Stripe test mode) owner completes checkout; the billing page confirms.
8. **Verify the webhook independently** — checkout confirmation self-heals via
   the success-URL return even if the webhook is dead, so don't stop at step 7:
   in Stripe Dashboard → Developers → Webhooks, confirm the endpoint shows
   recent `200` deliveries (or use "Send test event"). Later subscription
   events (renewals, payment failures) arrive ONLY via the webhook.

## Ongoing operations

- **Schema changes:** this project uses `prisma db push` for simplicity. Once
  you have real production data, adopt Prisma Migrate — but note a database
  created via `db push` has no migration history, so you must **baseline**
  first (generate an initial migration with `prisma migrate diff`, then mark it
  applied with `prisma migrate resolve --applied`); follow Prisma's "Adding
  Prisma Migrate to an existing project" guide. `migrate dev` also needs a
  local **Postgres** once the provider is switched — local SQLite can't
  generate Postgres SQL.
- **Backups:** Neon/Railway have point-in-time recovery built in; on a VPS,
  cron `pg_dump` (above).
- **Session housekeeping:** expired session rows accumulate slowly; clearing
  them is optional (`DELETE FROM "Session" WHERE "expiresAt" < now();`).
- **Monitoring:** point your uptime monitor at `/api/health` — it checks the
  database connection, not just the process.
- **Custom domains per tenant** (portal.theiragency.com) are a future add-on:
  it requires per-domain certificates + a `Domain → Tenant` lookup in
  middleware. The subdomain model needs zero per-tenant work, which is why
  it's the default.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Tenant subdomain shows the landing page or 404 | `ROOT_DOMAIN` doesn't match the host browsers send — most often it was set to `www.yourdomain.com` instead of the bare apex, or has a protocol/port mismatch — or wildcard DNS/cert isn't set up |
| `P1001: Can't reach database server` | Wrong `DATABASE_URL`, or your DB requires `?sslmode=require` |
| Prisma error mentioning `libssl`/OpenSSL in Docker | Rebuild the image — the Dockerfile installs OpenSSL; custom base images must too |
| `/api/stripe/webhook` returns 503 | `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` missing on the host |
| Stripe events signed-but-rejected (400) | Webhook secret from a different endpoint (test vs live mode mixup) |
| Owner subscribed but tenant stuck on TRIAL | Webhook endpoint URL wrong/unreachable — fix it; the owner's next visit to Billing after checkout also self-heals via the success-URL reconciliation |
