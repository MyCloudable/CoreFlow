import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { portalContext, companyScope } from "@/lib/portal";
import { Badge, Card, PageHeader, EmptyState } from "@/components/ui";
import { ORDER_STATUSES } from "@/lib/constants";
import { money, shortDate } from "@/lib/format";
import { addOrderItem, approveOrder, deleteOrderItem, setOrderStatus } from "@/lib/actions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, user, isStaff } = await portalContext(params);
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const order = await db.order.findFirst({
    where: { id: orderId, tenantId: tenant.id, ...companyScope(user) },
    include: { company: true, items: true },
  });
  if (!order) notFound();

  const total = order.items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
  const editable = isStaff && (order.status === "PENDING" || order.status === "APPROVED");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Order #${order.id} · ${order.title}`}
        subtitle={`${order.company.name} · Created ${shortDate(order.createdAt)}`}
        action={
          isStaff ? (
            <form action={setOrderStatus} className="flex items-center gap-2">
              <input type="hidden" name="orderId" value={order.id} />
              <select className="input w-44" name="status" defaultValue={order.status}>
                {Object.entries(ORDER_STATUSES).map(([value, s]) => (
                  <option key={value} value={value}>{s.label}</option>
                ))}
              </select>
              <button className="btn-secondary" type="submit">Update</button>
            </form>
          ) : (
            <Badge map={ORDER_STATUSES} value={order.status} />
          )
        }
      />

      {order.notes && <p className="mb-6 max-w-2xl text-sm text-gray-600">{order.notes}</p>}

      {!isStaff && order.status === "PENDING" && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm text-amber-900">This order is awaiting your approval.</p>
          <form action={approveOrder}>
            <input type="hidden" name="orderId" value={order.id} />
            <button className="btn-brand" type="submit">Approve order</button>
          </form>
        </div>
      )}

      <Card title="Line items">
        {order.items.length === 0 ? (
          <EmptyState message="No line items yet." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4 text-right">Qty</th>
                <th className="py-2 pr-4 text-right">Unit price</th>
                <th className="py-2 text-right">Amount</th>
                {editable && <th />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className="py-2.5 pr-4 text-gray-900">{i.description}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-gray-600">{i.quantity}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-gray-600">{money(i.unitPriceCents)}</td>
                  <td className="py-2.5 text-right tabular-nums text-gray-900">{money(i.quantity * i.unitPriceCents)}</td>
                  {editable && (
                    <td className="py-2.5 pl-3 text-right">
                      <form action={deleteOrderItem}>
                        <input type="hidden" name="itemId" value={i.id} />
                        <button className="text-xs text-gray-400 hover:text-red-600" type="submit" aria-label="Remove item">✕</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              <tr>
                <td colSpan={editable ? 3 : 3} className="py-3 pr-4 text-right font-semibold text-gray-900">Total</td>
                <td className="py-3 text-right font-semibold tabular-nums text-gray-900">{money(total)}</td>
                {editable && <td />}
              </tr>
            </tbody>
          </table>
        )}

        {editable && (
          <form action={addOrderItem} className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <input type="hidden" name="orderId" value={order.id} />
            <input className="input flex-1" name="description" placeholder="Line item description" aria-label="Line item description" required />
            <input className="input w-20" name="quantity" type="number" min="1" defaultValue="1" aria-label="Quantity" />
            <input className="input w-28" name="unitPrice" type="number" min="0" step="0.01" placeholder="Price $" aria-label="Unit price in dollars" required />
            <button className="btn-secondary shrink-0" type="submit">Add item</button>
          </form>
        )}
      </Card>
    </div>
  );
}
