import Link from "next/link";
import { db } from "@/lib/db";
import { portalContext, companyScope } from "@/lib/portal";
import { Badge, PageHeader, EmptyState, Table, RowLink } from "@/components/ui";
import { TICKET_STATUSES, TICKET_PRIORITIES } from "@/lib/constants";
import { dateTime } from "@/lib/format";

export default async function TicketsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, user, isStaff } = await portalContext(params);

  const tickets = await db.ticket.findMany({
    where: { tenantId: tenant.id, ...companyScope(user) },
    include: { company: true, assignedTo: true, _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Service tickets"
        subtitle={isStaff ? "Support requests across all clients." : "Your support requests."}
        action={<Link href="/tickets/new" className="btn-brand">New ticket</Link>}
      />

      {tickets.length === 0 ? (
        <EmptyState message="No tickets yet — open one and it lands here." />
      ) : (
        <Table headers={isStaff ? ["Ticket", "Client", "Priority", "Assignee", "Status", "Updated"] : ["Ticket", "Priority", "Status", "Updated"]}>
          {tickets.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-3">
                <RowLink href={`/tickets/${t.id}`}>#{t.id} · {t.subject}</RowLink>
                <p className="text-xs text-gray-500">{t._count.messages} message{t._count.messages === 1 ? "" : "s"}</p>
              </td>
              {isStaff && <td className="px-4 py-3 text-gray-600">{t.company.name}</td>}
              <td className="px-4 py-3"><Badge map={TICKET_PRIORITIES} value={t.priority} /></td>
              {isStaff && <td className="px-4 py-3 text-gray-600">{t.assignedTo?.name ?? "Unassigned"}</td>}
              <td className="px-4 py-3"><Badge map={TICKET_STATUSES} value={t.status} /></td>
              <td className="px-4 py-3 text-gray-600">{dateTime(t.updatedAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
