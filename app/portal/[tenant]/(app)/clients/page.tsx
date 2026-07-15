import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { portalContext } from "@/lib/portal";
import { Card, PageHeader, EmptyState } from "@/components/ui";

import { createCompany, createClientUser } from "@/lib/actions";

export default async function ClientsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, isStaff } = await portalContext(params);
  if (!isStaff) redirect("/");

  const companies = await db.clientCompany.findMany({
    where: { tenantId: tenant.id },
    include: {
      users: { orderBy: { name: "asc" } },
      _count: { select: { projects: true, tickets: true, orders: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Client companies and their portal logins. Client logins are free — you're only billed for team seats."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          {companies.length === 0 ? (
            <EmptyState message="No clients yet — add your first below." />
          ) : (
            companies.map((c) => (
              <Card
                key={c.id}
                title={c.name}
                action={
                  <span className="text-xs text-gray-500">
                    {c._count.projects} projects · {c._count.tickets} tickets · {c._count.orders} orders
                  </span>
                }
              >
                {(c.contactEmail || c.address) && (
                  <p className="mb-3 text-xs text-gray-500">
                    {c.contactEmail && <>Contact: {c.contactName ? `${c.contactName} · ` : ""}{c.contactEmail}</>}
                    {c.contactEmail && c.address && " · "}
                    {c.address}
                  </p>
                )}
                {c.users.length === 0 ? (
                  <p className="text-sm text-gray-500">No portal users yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {c.users.map((u) => (
                      <li key={u.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                        {!u.active && <span className="text-xs text-gray-500">Deactivated</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))
          )}
        </div>

        <div className="space-y-6">
          <Card title="Add client company">
            <form action={createCompany} className="space-y-4">
              <div>
                <label className="label" htmlFor="company-name">Company name</label>
                <input id="company-name" className="input" name="name" required placeholder="Northwind Traders" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="label" htmlFor="company-contact">Contact name</label>
                  <input id="company-contact" className="input" name="contactName" />
                </div>
                <div className="min-w-0">
                  <label className="label" htmlFor="company-email">Contact email</label>
                  <input id="company-email" className="input" name="contactEmail" type="email" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="company-address">Address (used for scheduled visits)</label>
                <input id="company-address" className="input" name="address" placeholder="123 Main St, Springfield" />
              </div>
              <button className="btn-brand" type="submit">Add company</button>
            </form>
          </Card>

          {companies.length > 0 && (
            <Card title="Add client portal login">
              <form action={createClientUser} className="space-y-4">
                <div>
                  <label className="label" htmlFor="login-company">Company</label>
                  <select id="login-company" className="input" name="companyId" required>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="label" htmlFor="login-name">Name</label>
                    <input id="login-name" className="input" name="name" required />
                  </div>
                  <div className="min-w-0">
                    <label className="label" htmlFor="login-email">Email</label>
                    <input id="login-email" className="input" name="email" type="email" required />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="login-password">Temporary password (8+ characters — share it with the client)</label>
                  <input id="login-password" className="input" name="password" type="text" required minLength={8} />
                </div>
                <button className="btn-brand" type="submit">Create login</button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
