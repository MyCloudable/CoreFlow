import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { portalContext, companyScope } from "@/lib/portal";
import { Badge, Card, PageHeader } from "@/components/ui";
import { TICKET_STATUSES, TICKET_PRIORITIES } from "@/lib/constants";
import { dateTime } from "@/lib/format";
import { replyToTicket, updateTicket } from "@/lib/actions";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, user, isStaff } = await portalContext(params);
  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) notFound();

  const [ticket, team] = await Promise.all([
    db.ticket.findFirst({
      where: { id: ticketId, tenantId: tenant.id, ...companyScope(user) },
      include: {
        company: true,
        assignedTo: true,
        messages: { include: { author: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    isStaff
      ? db.user.findMany({
          where: { tenantId: tenant.id, role: { in: ["OWNER", "STAFF", "TECH"] }, active: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);
  if (!ticket) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`#${ticket.id} · ${ticket.subject}`}
        subtitle={`${ticket.company.name} · Opened ${dateTime(ticket.createdAt)}`}
        action={
          <div className="flex items-center gap-2">
            <Badge map={TICKET_PRIORITIES} value={ticket.priority} />
            <Badge map={TICKET_STATUSES} value={ticket.status} />
          </div>
        }
      />

      {isStaff && (
        <Card title="Triage">
          <form action={updateTicket} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <div>
              <label className="label" htmlFor="triage-status">Status</label>
              <select id="triage-status" className="input w-44" name="status" defaultValue={ticket.status}>
                {Object.entries(TICKET_STATUSES).map(([value, s]) => (
                  <option key={value} value={value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="triage-priority">Priority</label>
              <select id="triage-priority" className="input w-36" name="priority" defaultValue={ticket.priority}>
                {Object.entries(TICKET_PRIORITIES).map(([value, p]) => (
                  <option key={value} value={value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="triage-assignee">Assignee</label>
              <select id="triage-assignee" className="input w-44" name="assignedToId" defaultValue={ticket.assignedToId ?? ""}>
                <option value="">Unassigned</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <button className="btn-secondary" type="submit">Save</button>
          </form>
        </Card>
      )}

      <div className="mt-6 space-y-4">
        {ticket.messages.map((m) => {
          const mine = m.authorId === user.id;
          const staffAuthor = m.author.role === "OWNER" || m.author.role === "STAFF";
          return (
            <div
              key={m.id}
              className={`rounded-xl border p-4 ${
                staffAuthor ? "border-gray-200 bg-white" : "border-[var(--brand)]/20 bg-[var(--brand)]/5"
              }`}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  {m.author.name}
                  {mine && <span className="ml-1.5 text-xs font-normal text-gray-400">(you)</span>}
                </p>
                <p className="text-xs text-gray-500">{dateTime(m.createdAt)}</p>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{m.body}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <Card title="Reply">
          <form action={replyToTicket} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <textarea className="input" name="body" rows={4} required placeholder="Write a reply…" aria-label="Reply" />
            <button className="btn-brand" type="submit">Send reply</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
