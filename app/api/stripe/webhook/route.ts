import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { applyCompletedCheckout, getStripe, planStatusFromStripe } from "@/lib/stripe";

// Stripe webhook: keeps Tenant.planStatus and subscription IDs in sync.
// Configure the endpoint in Stripe pointing at <root domain>/api/stripe/webhook.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const tenantId = session.metadata?.tenantId;
      if (tenantId && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const customerId = typeof session.customer === "string" ? session.customer : undefined;
        await applyCompletedCheckout(tenantId, subscriptionId, customerId);
      }
      break;
    }

    // Only the tenant's CURRENT subscription may change its status — events
    // from stale/duplicate subscriptions (e.g. a canceled duplicate after a
    // double checkout) must not suspend a healthy tenant.
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const status = planStatusFromStripe(subscription.status);
      if (status) {
        await db.tenant.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { planStatus: status },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await db.tenant.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { planStatus: "SUSPENDED", stripeSubscriptionId: null },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await db.tenant.updateMany({
          where: { stripeCustomerId: customerId, stripeSubscriptionId: { not: null } },
          data: { planStatus: "PAST_DUE" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
