import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { monthlyTotalCents } from "@/lib/billing";
import { portalUrl } from "@/lib/tenant";
import { Badge, Card, PageHeader, StatCard, Table } from "@/components/ui";
import { SEAT_ROLES, TENANT_STATUSES } from "@/lib/constants";
import { money, shortDate } from "@/lib/format";
import { adminLogout, createTenant, setTenantStatus } from "@/lib/actions";

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "PLATFORM_ADMIN") redirect("/admin/login");

  const tenants = await db.tenant.findMany({
    include: {
      users: { where: { active: true, role: { in: [...SEAT_ROLES] } }, select: { id: true } },
      _count: { select: { companies: true, tickets: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = tenants.map((t) => ({
    ...t,
    seats: t.users.length,
    mrrCents: monthlyTotalCents(t, t.users.length),
  }));
  const billable = rows.filter((t) => t.planStatus === "ACTIVE" || t.planStatus === "PAST_DUE");
  const totalMrr = billable.reduce((sum, t) => sum + t.mrrCents, 0);
  const totalSeats = rows.reduce((sum, t) => sum + t.seats, 0);

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <PageHeader
        title="CoreFlow admin"
        subtitle={`Signed in as ${user.email}`}
        action={
          <form action={adminLogout}>
            <button className="btn-secondary" type="submit">Sign out</button>
          </form>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tenants" value={rows.length} hint={`${billable.length} billable`} />
        <StatCard label="MRR" value={money(totalMrr)} hint="Active + past-due tenants" />
        <StatCard label="Total seats" value={totalSeats} />
        <StatCard label="Trials" value={rows.filter((t) => t.planStatus === "TRIAL").length} />
      </div>

      <div className="mb-8">
        <Table headers={["Tenant", "Portal", "Clients", "Seats", "MRR", "Status", "Since", ""]}>
          {rows.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
              <td className="px-4 py-3">
                <a href={portalUrl(t.slug)} className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">
                  {t.slug}.{process.env.ROOT_DOMAIN ?? "localhost:3000"}
                </a>
              </td>
              <td className="px-4 py-3 text-gray-600">{t._count.companies}</td>
              <td className="px-4 py-3 text-gray-600">{t.seats}</td>
              <td className="px-4 py-3 tabular-nums text-gray-900">{money(t.mrrCents)}</td>
              <td className="px-4 py-3">
                <Badge map={TENANT_STATUSES} value={t.planStatus} />
                {t.planStatus === "TRIAL" && t.trialEndsAt && (
                  <p className="mt-1 text-[11px] text-gray-500">ends {shortDate(t.trialEndsAt)}</p>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">{shortDate(t.createdAt)}</td>
              <td className="px-4 py-3">
                <form action={setTenantStatus} className="flex items-center gap-1.5">
                  <input type="hidden" name="tenantId" value={t.id} />
                  <label className="sr-only" htmlFor={`tenant-status-${t.id}`}>Change status</label>
                  <select id={`tenant-status-${t.id}`} className="input w-32 py-1 text-xs" name="status" defaultValue={t.planStatus}>
                    {Object.entries(TENANT_STATUSES).map(([value, s]) => (
                      <option key={value} value={value}>{s.label}</option>
                    ))}
                  </select>
                  <button className="btn-secondary px-2 py-1 text-xs" type="submit">Set</button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      <div className="max-w-xl">
        <Card title="Create tenant">
          <form action={createTenant} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="label" htmlFor="tenant-name">Business name</label>
                <input id="tenant-name" className="input" name="name" required placeholder="Acme Marketing" />
              </div>
              <div className="min-w-0">
                <label className="label" htmlFor="tenant-slug">Subdomain</label>
                <input id="tenant-slug" className="input" name="slug" required placeholder="acme" pattern="[a-z0-9][a-z0-9-]*" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="label" htmlFor="tenant-owner">Owner name</label>
                <input id="tenant-owner" className="input" name="ownerName" required />
              </div>
              <div className="min-w-0">
                <label className="label" htmlFor="tenant-email">Owner email</label>
                <input id="tenant-email" className="input" name="ownerEmail" type="email" required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="tenant-password">Owner temporary password (8+ characters)</label>
              <input id="tenant-password" className="input" name="ownerPassword" type="text" required minLength={8} />
            </div>
            <button className="btn w-full bg-gray-900 text-white hover:bg-gray-800" type="submit">
              Create tenant
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
