import "server-only";
import { db } from "@/lib/db";
import { SEAT_ROLES } from "@/lib/constants";

export const TRIAL_DAYS = 14;

/** Team seats = active OWNER + STAFF + TECH users. Clients are always free. */
export async function seatCount(tenantId: string): Promise<number> {
  return db.user.count({
    where: { tenantId, active: true, role: { in: [...SEAT_ROLES] } },
  });
}

type PlanShape = { basePriceCents: number; seatPriceCents: number; includedSeats: number };

/** Seats charged beyond what the base plan includes. */
export function billableSeats(plan: Pick<PlanShape, "includedSeats">, seats: number): number {
  return Math.max(0, seats - plan.includedSeats);
}

export function monthlyTotalCents(plan: PlanShape, seats: number): number {
  return plan.basePriceCents + billableSeats(plan, seats) * plan.seatPriceCents;
}

type TenantBilling = PlanShape & {
  id: string;
  planStatus: string;
  trialEndsAt: Date | null;
  stripeSubscriptionId: string | null;
};

/** Whole days of trial remaining (0 if none/expired). */
export function trialDaysLeft(tenant: { planStatus: string; trialEndsAt: Date | null }): number {
  if (tenant.planStatus !== "TRIAL" || !tenant.trialEndsAt) return 0;
  return Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / 86_400_000));
}

/** True when the free trial ran out and no subscription was started.
 *  The owner keeps access (to subscribe); everyone else sees a lock screen. */
export function trialExpired(tenant: {
  planStatus: string;
  trialEndsAt: Date | null;
  stripeSubscriptionId: string | null;
}): boolean {
  return (
    tenant.planStatus === "TRIAL" &&
    !!tenant.trialEndsAt &&
    tenant.trialEndsAt.getTime() < Date.now() &&
    !tenant.stripeSubscriptionId
  );
}

/** Billing summary for a tenant — used on the tenant billing page and the
 *  platform admin dashboard (MRR column). */
export async function billingSummary(tenant: TenantBilling) {
  const seats = await seatCount(tenant.id);
  return {
    seats,
    includedSeats: tenant.includedSeats,
    billableSeats: billableSeats(tenant, seats),
    baseCents: tenant.basePriceCents,
    seatCents: tenant.seatPriceCents,
    totalCents: monthlyTotalCents(tenant, seats),
    status: tenant.planStatus,
    trialDaysLeft: trialDaysLeft(tenant),
    trialExpired: trialExpired(tenant),
  };
}
