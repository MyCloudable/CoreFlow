import "server-only";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { SEAT_ROLES } from "@/lib/constants";

/**
 * Stripe subscription billing: $99/mo base price + $5/mo per-seat price,
 * with the 14-day free trial carried into the subscription.
 *
 * Setup (one time, in the Stripe dashboard or CLI):
 *   1. Create a Product ("Client Portal Platform") with two recurring Prices:
 *      a flat monthly base price and a per-unit monthly seat price.
 *   2. Set env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *      STRIPE_PRICE_BASE=price_..., STRIPE_PRICE_SEAT=price_...
 *   3. Point a webhook at POST /api/stripe/webhook with events:
 *      checkout.session.completed, customer.subscription.updated,
 *      customer.subscription.deleted, invoice.payment_failed.
 *
 * Without ALL FOUR env vars everything below no-ops and tenants are managed
 * manually from the platform admin console (trial dates still enforce).
 * The webhook secret is required on purpose: offering checkout without the
 * status-sync pipeline would take payment and then lock the tenant out when
 * the trial date passes.
 */

export function stripeEnabled(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_BASE &&
      process.env.STRIPE_PRICE_SEAT
  );
}

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

async function ensureCustomer(tenantId: string): Promise<string> {
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId;
  const owner = await db.user.findFirst({
    where: { tenantId, role: "OWNER", active: true },
    orderBy: { createdAt: "asc" },
  });
  const customer = await getStripe().customers.create({
    name: tenant.name,
    email: owner?.email,
    metadata: { tenantId },
  });
  // Atomic claim: if a concurrent call won the race, use its customer id and
  // discard ours so exactly one customer stays linked to the tenant.
  const claimed = await db.tenant.updateMany({
    where: { id: tenantId, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  if (claimed.count === 0) {
    await getStripe().customers.del(customer.id).catch(() => {});
    const winner = await db.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    return winner.stripeCustomerId!;
  }
  return customer.id;
}

/** Start a subscription via Stripe Checkout. Any remaining free-trial time
 *  carries over (Stripe requires trial_end ≥ 48h out; with less remaining,
 *  billing simply starts now). Returns the URL to redirect the owner to.
 *  Throws if the tenant already has a subscription — callers must check. */
export async function createCheckoutSession(
  tenantId: string,
  seats: number,
  returnUrl: string
): Promise<string> {
  const tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  if (tenant.stripeSubscriptionId) {
    throw new Error("Tenant already has a subscription");
  }
  const customerId = await ensureCustomer(tenantId);

  // Refuse if Stripe already has a live subscription for this customer —
  // covers stale checkout tabs and 24h-old abandoned sessions completing late.
  const existing = await getStripe().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  const live = existing.data.find((s) => ["active", "trialing", "past_due"].includes(s.status));
  if (live) {
    await db.tenant.update({
      where: { id: tenantId },
      data: { stripeSubscriptionId: live.id, planStatus: planStatusFromStripe(live.status) ?? "ACTIVE" },
    });
    throw new Error("Tenant already has a subscription");
  }

  const trialEndsAt = tenant.trialEndsAt?.getTime() ?? 0;
  const keepTrial = tenant.planStatus === "TRIAL" && trialEndsAt > Date.now() + 48 * 3600 * 1000;

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      { price: process.env.STRIPE_PRICE_BASE!, quantity: 1 },
      { price: process.env.STRIPE_PRICE_SEAT!, quantity: Math.max(1, seats) },
    ],
    subscription_data: {
      metadata: { tenantId },
      ...(keepTrial ? { trial_end: Math.floor(trialEndsAt / 1000) } : {}),
    },
    metadata: { tenantId },
    success_url: `${returnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?checkout=canceled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Persist the subscription from a completed Checkout session. Used by both
 *  the webhook and the success-URL return, so a tenant is never left unsynced
 *  by a missed/slow webhook. Also reconciles the seat quantity, since team
 *  membership may have changed between starting and completing checkout. */
export async function applyCompletedCheckout(
  tenantId: string,
  subscriptionId: string,
  customerId?: string
): Promise<void> {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionId: subscriptionId,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      planStatus: planStatusFromStripe(subscription.status) ?? "ACTIVE",
    },
  });
  await syncSeatQuantity(tenantId);
}

/** Success-URL fallback: verify the session with Stripe and sync the tenant.
 *  Safe to call with anything the browser sends — the session must belong to
 *  this tenant and be complete. */
export async function reconcileCheckoutSession(tenantId: string, sessionId: string): Promise<void> {
  if (!stripeEnabled() || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.tenantId !== tenantId || session.status !== "complete") return;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subscriptionId) return;
    const customerId = typeof session.customer === "string" ? session.customer : undefined;
    await applyCompletedCheckout(tenantId, subscriptionId, customerId);
  } catch {
    // Best-effort — the webhook remains the source of truth.
  }
}

/** Stripe-hosted billing portal (payment method, invoices, cancel). */
export async function createBillingPortalSession(
  tenantId: string,
  returnUrl: string
): Promise<string> {
  const customerId = await ensureCustomer(tenantId);
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

/** Keep the subscription's seat quantity in line with active team members.
 *  Recomputes the count itself immediately before writing so concurrent team
 *  changes can't win with a stale value. No-ops until Stripe is configured
 *  and the tenant has subscribed. */
export async function syncSeatQuantity(tenantId: string): Promise<void> {
  if (!stripeEnabled()) return;
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.stripeSubscriptionId) return;
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
  const seatItem = subscription.items.data.find(
    (item) => item.price.id === process.env.STRIPE_PRICE_SEAT
  );
  if (!seatItem) return;
  const seats = await db.user.count({
    where: { tenantId, active: true, role: { in: [...SEAT_ROLES] } },
  });
  const quantity = Math.max(1, seats);
  if (seatItem.quantity === quantity) return;
  await stripe.subscriptionItems.update(seatItem.id, {
    quantity,
    proration_behavior: "create_prorations",
  });
}

/** Map a Stripe subscription status onto our Tenant.planStatus vocabulary. */
export function planStatusFromStripe(status: Stripe.Subscription.Status): string | null {
  switch (status) {
    case "trialing":
      return "TRIAL";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "incomplete":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "SUSPENDED";
    default:
      return null; // paused etc. — leave unchanged
  }
}
