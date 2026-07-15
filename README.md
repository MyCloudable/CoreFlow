# CoreFlow

The white-label client & field service delivery platform: agencies, consultants,
and field-service businesses give each client a **branded portal** — deliverables,
project progress, service tickets, orders, reports, and scheduled visits — under
their own name and colors. CoreFlow branding appears only on the operator surfaces
(landing page and `/admin`); every tenant portal carries the tenant's brand.

Repository: [MyCloudable/CoreFlow](https://github.com/MyCloudable/CoreFlow)

**Business model (built in):** $99/mo base + $5/mo per team seat (owner, staff,
and technicians), with a **14-day free trial** for every new tenant. Client
logins are unlimited and free — that's what makes the portal sticky.

## How it's organized

One Next.js app serves four surfaces, split by hostname and role:

| Surface | URL | Who |
|---|---|---|
| Marketing / landing | `localhost:3000` | Public |
| Platform admin (us) | `localhost:3000/admin` | You — tenants, trials, MRR |
| Tenant portal | `<slug>.localhost:3000` | Tenant team + their clients |
| Field portal (mobile) | `<slug>.localhost:3000/tech` | Technicians — auto-routed on login |

`middleware.ts` reads the subdomain and rewrites to `/portal/<slug>/...`
internally; the browser URL stays clean. One wildcard DNS record covers every
tenant in production.

**Roles:** `PLATFORM_ADMIN` (us) → tenant `OWNER` / `STAFF` / `TECH` (billable
seats) → `CLIENT` (free, scoped to their own company). Every query filters by
tenant, and clients additionally by company (`companyScope()` in
[lib/portal.ts](lib/portal.ts)). Technicians only see tickets and visits
assigned to them.

## Run it

```bash
npm install
npm run setup     # creates SQLite db + seeds demo data
npm run dev
```

Demo logins (all seeded):

| Who | URL | Email | Password |
|---|---|---|---|
| Platform admin | localhost:3000/admin | admin@platform.local | admin1234 |
| Tenant owner | acme.localhost:3000 | owner@acme.local | owner1234 |
| Tenant staff | acme.localhost:3000 | staff@acme.local | staff1234 |
| **Technician** | acme.localhost:3000 | tech@acme.local | tech1234 |
| Client | acme.localhost:3000 | client@northwind.local | client1234 |
| Trial-tenant owner | bright.localhost:3000 | owner@bright.local | owner1234 |

The technician login lands in the mobile field portal (resize your browser to
phone width for the intended experience). Seeded visits use relative dates, so
"Today" always has jobs on it.

## Field service flow

1. Staff open **Schedule** (dispatch board): book a visit — assign any team
   member, link an open ticket (the visit inherits the ticket's client),
   date/start/duration, address defaults to the client company's address.
2. The technician sees it under **Today / Schedule** in the field portal and
   advances it: On my way → Arrived on site → Complete job. Big buttons,
   Google-Maps address links, job notes.
3. Assigned tickets are workable from the field: reply to the thread, Start
   work / Resolve. A tech reply flips the ticket to "waiting on client".
4. Clients see their upcoming visits (and live status) on their dashboard.

## Billing & the 14-day trial

- Every tenant created from `/admin` starts on a **14-day trial**
  (`Tenant.trialEndsAt`). Owners see a countdown banner with a "Set up billing"
  CTA; the platform admin table shows each trial's end date.
- **Trial expiry lock:** when the trial lapses with no subscription, staff,
  techs, and clients get a lock screen; the owner keeps access and is pushed to
  Billing. Data is never touched. (No Stripe keys? You can flip a tenant to
  ACTIVE manually from `/admin` — manual invoicing mode.)
- **Stripe (live mode):** set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_BASE` (flat $99/mo price), `STRIPE_PRICE_SEAT` ($5/mo per-unit
  price) in `.env`. Then:
  - Owner clicks **Set up billing** → Stripe Checkout (base + seat quantity),
    remaining trial time carries into the subscription (`trial_end`), so card
    now, charge when the trial ends.
  - **Manage billing** opens the Stripe billing portal (payment method,
    invoices, cancel).
  - Seat changes (add/deactivate team member) sync the subscription quantity
    automatically with prorations ([lib/stripe.ts](lib/stripe.ts)).
  - Webhook `POST /api/stripe/webhook` (events: `checkout.session.completed`,
    `customer.subscription.updated`, `customer.subscription.deleted`,
    `invoice.payment_failed`) keeps `Tenant.planStatus` in sync — TRIAL /
    ACTIVE / PAST_DUE / SUSPENDED. Past-due owners see a fix-billing banner;
    suspended tenants get the lock screen.
  - Local webhook testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Day-to-day operations (us)

Everything is in `/admin`: create tenants (name + subdomain + owner login,
trial starts automatically), watch MRR/seats/trials at a glance, and
suspend/reactivate with one dropdown. Tenants self-serve everything else —
branding, team, clients, scheduling, and delivery work.

## Going to production

Full step-by-step guide: **[DEPLOYMENT.md](DEPLOYMENT.md)** — covers
Vercel + Neon (recommended), Railway, and Docker on a VPS, plus wildcard DNS,
Stripe go-live, the post-deploy smoke test, and troubleshooting.

The short version: switch the Prisma provider to `postgresql` (one line), push
to GitHub, deploy with `DATABASE_URL` + `ROOT_DOMAIN` set, add `yourdomain.com`
and `*.yourdomain.com` domains, run `npx prisma db push` and
`npm run create-admin` against the production database (never the demo seed).

## Architecture notes

- **Stack**: Next.js 15 (App Router, server components + server actions),
  Prisma, Tailwind v4, Inter via `next/font`. No client-state library; the only
  client components are the nav links and the mobile slide-over.
- **Auth**: bcrypt hashes, DB-backed session tokens in httpOnly cookies,
  host-scoped per subdomain. Server actions re-derive tenant + role from the
  session and Host header — never from form data.
- **White-labeling**: tenant brand color feeds a `--brand` CSS variable;
  derived tints (`--brand-soft`, `--brand-strong`, …) are computed with CSS
  `color-mix` **per element** so they re-resolve wherever `--brand` is
  overridden (see the comment in [app/globals.css](app/globals.css)).
- **Field data model**: `Appointment` links tenant + client company + assigned
  tech + optional ticket, with a five-state lifecycle (scheduled → en route →
  on site → completed, or canceled by dispatch).

## What's deliberately not here yet

- File uploads for deliverables (links to Drive/Dropbox/Figma work today)
- Email notifications (ticket replies, trial reminders — Stripe sends its own
  trial-ending emails once subscribed)
- Client password self-reset (owners/staff set passwords today)
- Custom domains per tenant (subdomains are the default; CNAME + cert
  automation is a later add-on)
- Route optimization / drive-time on the dispatch board
