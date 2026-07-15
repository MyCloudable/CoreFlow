import Link from "next/link";
import { db } from "@/lib/db";
import { techContext } from "@/lib/portal";
import { Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/constants";
import { dateTime } from "@/lib/format";

const OPEN_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT"];

export default async function TechTicketsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, user } = await techContext(params);

  const tickets = await db.ticket.findMany({
    where: { tenantId: tenant.id, assignedToId: user.id },
    include: { company: true, _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const open = tickets.filter((t) => OPEN_STATUSES.includes(t.status));
  const closed = tickets.filter((t) => !OPEN_STATUSES.includes(t.status));

  const TicketRow = ({ ticket }: { ticket: (typeof tickets)[number] }) => (
    <Link
      href={`/tech/tickets/${ticket.id}`}
      className="block rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs active:bg-gray-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-snug text-gray-900">
            #{ticket.id} · {ticket.subject}
          </p>
          <p className="mt-1 text-sm text-gray-600">{ticket.company.name}</p>
          <p className="mt-1 text-xs text-gray-500">Updated {dateTime(ticket.updatedAt)}</p>
        </div>
        <Icon name="chevron-right" className="mt-1 h-4 w-4 shrink-0 text-gray-300" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge map={TICKET_STATUSES} value={ticket.status} />
        <Badge map={TICKET_PRIORITIES} value={ticket.priority} />
      </div>
    </Link>
  );

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-gray-900">My tickets</h1>
      <p className="mt-0.5 text-sm text-gray-500">Tickets assigned to you.</p>

      {tickets.length === 0 ? (
        <div className="mt-6">
          <EmptyState message="No tickets assigned to you yet." icon="message" />
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="mt-5 space-y-3">
              {open.map((t) => (
                <TicketRow key={t.id} ticket={t} />
              ))}
            </div>
          )}
          {closed.length > 0 && (
            <>
              <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Resolved & closed
              </h2>
              <div className="space-y-3">
                {closed.map((t) => (
                  <TicketRow key={t.id} ticket={t} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
