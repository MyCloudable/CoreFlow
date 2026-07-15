import "server-only";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { trialExpired } from "@/lib/billing";

/** Resolve tenant + signed-in user for a portal page; redirects to the
 *  tenant login when there is no valid session for THIS tenant.
 *
 *  The suspended/trial-expired lockout for non-owners lives HERE, not in the
 *  layouts: App Router renders pages in parallel with layouts, so a layout
 *  that hides children still ships the page's data in the flight payload.
 *  Redirecting from the page's own data entry point aborts the page render. */
export async function portalContext(params: Promise<{ tenant: string }>) {
  const { tenant: slug } = await params;
  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant) notFound();
  const user = await getCurrentUser();
  if (!user || user.tenantId !== tenant.id) redirect("/login");

  const locked = tenant.planStatus === "SUSPENDED" || trialExpired(tenant);
  if (locked && user.role !== "OWNER") redirect("/locked");

  const isStaff = user.role === "OWNER" || user.role === "STAFF";
  return {
    tenant,
    user,
    isStaff,
    isOwner: user.role === "OWNER",
    isTech: user.role === "TECH",
  };
}

/** Guard for the mobile field portal — technicians only. */
export async function techContext(params: Promise<{ tenant: string }>) {
  const ctx = await portalContext(params);
  if (!ctx.isTech) redirect("/");
  return ctx;
}

/** Prisma where-fragment that scopes list queries: team members see the whole
 *  tenant, clients see only their own company's records. */
export function companyScope(user: { role: string; companyId: string | null }) {
  if (user.role === "CLIENT") return { companyId: user.companyId ?? "__none__" };
  return {};
}
