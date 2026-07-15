import { db } from "@/lib/db";
import { portalContext, companyScope } from "@/lib/portal";
import { Badge, Card, PageHeader, EmptyState, Table, RowLink } from "@/components/ui";
import { ORDER_STATUSES } from "@/lib/constants";
import { money, shortDate } from "@/lib/format";
import { createOrder } from "@/lib/actions";

export default async function OrdersPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, user, isStaff } = await portalContext(params);

  const [orders, companies] = await Promise.all([
    db.order.findMany({
      where: { tenantId: tenant.id, ...companyScope(user) },
      include: { company: true, items: true },
      orderBy: { createdAt: "desc" },
    }),
    isStaff
      ? db.clientCompany.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={isStaff ? "Work orders and proposals across clients." : "Orders for your review and approval."}
      />

      {orders.length === 0 ? (
        <EmptyState message="No orders yet." />
      ) : (
        <Table headers={isStaff ? ["Order", "Client", "Total", "Status", "Created"] : ["Order", "Total", "Status", "Created"]}>
          {orders.map((o) => {
            const total = o.items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
            return (
              <tr key={o.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <RowLink href={`/orders/${o.id}`}>#{o.id} · {o.title}</RowLink>
                </td>
                {isStaff && <td className="px-4 py-3 text-gray-600">{o.company.name}</td>}
                <td className="px-4 py-3 tabular-nums text-gray-900">{money(total)}</td>
                <td className="px-4 py-3"><Badge map={ORDER_STATUSES} value={o.status} /></td>
                <td className="px-4 py-3 text-gray-600">{shortDate(o.createdAt)}</td>
              </tr>
            );
          })}
        </Table>
      )}

      {isStaff && (
        <div className="mt-8 max-w-xl">
          <Card title="New order">
            <form action={createOrder} className="space-y-4">
              <div>
                <label className="label" htmlFor="order-company">Client</label>
                <select id="order-company" className="input" name="companyId" required>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="order-title">Title</label>
                <input id="order-title" className="input" name="title" required placeholder="Monthly retainer — August" />
              </div>
              <div>
                <label className="label" htmlFor="order-notes">Notes</label>
                <textarea id="order-notes" className="input" name="notes" rows={2} />
              </div>
              <button className="btn-brand" type="submit">Create order (add line items next)</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
