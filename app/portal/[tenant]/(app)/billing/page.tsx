import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { portalContext } from "@/lib/portal";
import { billingSummary } from "@/lib/billing";
import { reconcileCheckoutSession, stripeEnabled } from "@/lib/stripe";
import { openBillingPortal, startCheckout } from "@/lib/actions";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { Icon } from "@/components/icons";
import { TENANT_STATUSES } from "@/lib/constants";
import { money, shortDate } from "@/lib/format";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
}) {
  const ctx = await portalContext(params);
  if (!ctx.isOwner) redirect("/");
  const { checkout, session_id } = await searchParams;

  // Returning from Stripe Checkout: sync immediately instead of waiting on the
  // webhook, then re-read the tenant so the page reflects the subscription.
  let tenant = ctx.tenant;
  if (checkout === "success" && session_id && !tenant.stripeSubscriptionId) {
    await reconcileCheckoutSession(tenant.id, session_id);
    tenant = (await db.tenant.findUnique({ where: { id: tenant.id } })) ?? tenant;
  }

  const summary = await billingSummary(tenant);
  const subscribed = Boolean(tenant.stripeSubscriptionId);
  const onTrial = tenant.planStatus === "TRIAL" && !summary.trialExpired;
  // Stripe can only carry a trial that has 48+ hours left; under that, billing
  // starts at checkout — the copy must not promise otherwise.
  const trialCarriesOver =
    onTrial && (tenant.trialEndsAt?.getTime() ?? 0) > Date.now() + 48 * 3600 * 1000;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Billing"
        subtitle="Flat platform fee plus a per-seat charge for each active team member. Client logins are always free."
        action={<Badge map={TENANT_STATUSES} value={tenant.planStatus} />}
      />

      {checkout === "success" && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <Icon name="check" className="h-4 w-4" />
          {subscribed
            ? "Subscription active — you're all set."
            : "Checkout completed — finalizing your subscription. Refresh in a few seconds."}
        </div>
      )}
      {checkout === "canceled" && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout canceled — no changes were made.
        </div>
      )}

      {onTrial && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--brand)]/20 bg-[var(--brand-soft)] px-5 py-4">
          <div>
            <p className="font-medium text-[var(--brand-strong)]">
              Free trial — {summary.trialDaysLeft} day{summary.trialDaysLeft === 1 ? "" : "s"} remaining
            </p>
            <p className="mt-0.5 text-sm text-gray-600">
              {tenant.trialEndsAt ? `Trial ends ${shortDate(tenant.trialEndsAt)}. ` : ""}
              {trialCarriesOver
                ? "Add billing now — you won't be charged until the trial ends."
                : "Less than two days left — billing starts as soon as you subscribe."}
            </p>
          </div>
        </div>
      )}
      {summary.trialExpired && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-medium text-red-800">Your free trial has ended</p>
          <p className="mt-0.5 text-sm text-red-700">
            Your team and clients are locked out until a subscription is started. Your data is safe.
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Base plan" value={`${money(summary.baseCents)}/mo`} hint="Platform fee" icon="credit-card" />
        <StatCard
          label="Team seats"
          value={summary.seats}
          hint={`${money(summary.seatCents)}/mo each`}
          icon="users"
        />
        <StatCard label="Monthly total" value={`${money(summary.totalCents)}/mo`} icon="chart" />
      </div>

      <Card title="Subscription">
        {stripeEnabled() ? (
          subscribed ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                Payment method, invoices, and cancellation are handled securely by Stripe.
              </p>
              <form action={openBillingPortal}>
                <button className="btn-secondary" type="submit">
                  Manage billing
                  <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-md text-sm text-gray-600">
                Start your subscription — {money(summary.totalCents)}/mo for your current team
                {trialCarriesOver ? ", with nothing charged until your trial ends" : ""}. Seats
                adjust automatically as you add or remove team members.
              </p>
              <form action={startCheckout}>
                <button className="btn-brand" type="submit">
                  Set up billing
                  <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )
        ) : (
          <p className="text-sm text-gray-600">
            Online payment isn&apos;t enabled yet — your provider will invoice you directly. Seat
            changes on the <span className="font-medium">Team</span> page update the total above
            automatically.
          </p>
        )}
      </Card>
    </div>
  );
}
