import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { trialExpired } from "@/lib/billing";
import { portalLogout } from "@/lib/actions";
import { Icon } from "@/components/icons";

// Lock screen for non-owners of a suspended / trial-expired tenant.
// Deliberately does NOT use portalContext (which redirects here).
export default async function LockedPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant) notFound();

  const user = await getCurrentUser();
  if (!user || user.tenantId !== tenant.id) redirect("/login");

  const locked = tenant.planStatus === "SUSPENDED" || trialExpired(tenant);
  if (!locked || user.role === "OWNER") redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Icon name="alert" className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold text-gray-900">{tenant.name}</h1>
        <p className="mt-2 text-sm text-gray-600">
          This portal is currently unavailable. Please contact
          {tenant.supportEmail ? ` ${tenant.supportEmail}` : " your service provider"} to restore
          access.
        </p>
        <form action={portalLogout} className="mt-5">
          <button className="btn-secondary" type="submit">Sign out</button>
        </form>
      </div>
    </div>
  );
}
