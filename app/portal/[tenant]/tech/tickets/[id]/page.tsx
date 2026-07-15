import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { techContext } from "@/lib/portal";
import { replyToTicket, techSetTicketStatus } from "@/lib/actions";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { APPOINTMENT_STATUSES, TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/constants";
import { dateTime, timeRange, dayLabel } from "@/lib/format";

export default async function TechTicketDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, user } = await techContext(params);
  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) notFound();

  // Technicians only ever see tickets assigned to them.
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, tenantId: tenant.id, assignedToId: user.id },
    include: {
      company: true,
      messages: { include: { author: true }, orderBy: { createdAt: "asc" } },
      appointments: { orderBy: { scheduledStart: "asc" } },
    },
  });
  if (!ticket) notFound();

  const canStart = ticket.status === "OPEN" || ticket.status === "WAITING_ON_CLIENT";
  const canResolve = ticket.status !== "RESOLVED" && ticket.status !== "CLOSED";

  return (
    <div>
      <Link
        href="/tech/tickets"
        className="-mx-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-[var(--brand)] active:bg-gray-100"
      >
        <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
        My tickets
      </Link>

      <h1 className="text-lg font-semibold leading-snug tracking-tight text-gray-900">
        #{ticket.id} · {ticket.subject}
      </h1>
      <p className="mt-1 text-sm text-gray-600">{ticket.company.name}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge map={TICKET_STATUSES} value={ticket.status} />
        <Badge map={TICKET_PRIORITIES} value={ticket.priority} />
      </div>

      {/* Status actions — big targets, narrow set of transitions */}
      {(canStart || canResolve) && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {canStart && (
            <form action={techSetTicketStatus}>
              <input type="hidden" name="ticketId" value={ticket.id} />
              <input type="hidden" name="status" value="IN_PROGRESS" />
              <button className="btn-secondary btn-lg w-full" type="submit">
                <Icon name="clock" className="h-5 w-5" />
                Start work
              </button>
            </form>
          )}
          {canResolve && (
            <form action={techSetTicketStatus} className={canStart ? "" : "col-span-2"}>
              <input type="hidden" name="ticketId" value={ticket.id} />
              <input type="hidden" name="status" value="RESOLVED" />
              <button className="btn-brand btn-lg w-full" type="submit">
                <Icon name="check" className="h-5 w-5" />
                Resolve
              </button>
            </form>
          )}
        </div>
      )}

      {ticket.appointments.length > 0 && (
        <div className="mt-5 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Visits</h2>
          {ticket.appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm shadow-xs ring-1 ring-gray-200/80">
              <span className="text-gray-700">
                {dayLabel(a.scheduledStart)} · {timeRange(a.scheduledStart, a.scheduledEnd)}
              </span>
              <Badge map={APPOINTMENT_STATUSES} value={a.status} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {ticket.messages.map((m) => {
          const mine = m.authorId === user.id;
          return (
            <div
              key={m.id}
              className={`rounded-2xl p-4 shadow-xs ${
                mine
                  ? "bg-[var(--brand-soft)] ring-1 ring-[var(--brand)]/15"
                  : "bg-white ring-1 ring-gray-200/80"
              }`}
            >
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">{mine ? "You" : m.author.name}</p>
                <p className="text-[11px] text-gray-500">{dateTime(m.createdAt)}</p>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{m.body}</p>
            </div>
          );
        })}
      </div>

      <form action={replyToTicket} className="mt-4 space-y-2">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <textarea
          className="input min-h-24 rounded-2xl"
          name="body"
          placeholder="Add an update…"
          aria-label="Add an update"
          required
        />
        <button className="btn-brand btn-lg w-full" type="submit">Send update</button>
      </form>
    </div>
  );
}
