import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { portalContext } from "@/lib/portal";
import { createAppointment, setAppointmentStatus } from "@/lib/actions";
import { Badge, Card, EmptyState, PageHeader, RowLink } from "@/components/ui";
import { Icon } from "@/components/icons";
import { APPOINTMENT_STATUSES, ROLES, SEAT_ROLES, type Role } from "@/lib/constants";
import { dayKey, dayLabel, timeRange, shortDate } from "@/lib/format";

const DURATIONS = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 90, label: "1.5 hours" },
  { minutes: 120, label: "2 hours" },
  { minutes: 240, label: "4 hours" },
  { minutes: 480, label: "Full day" },
];

type AppointmentRowData = Awaited<ReturnType<typeof getAppointments>>[number];

function getAppointments(tenantId: string, where: object) {
  return db.appointment.findMany({
    where: { tenantId, ...where },
    include: { company: true, tech: true, ticket: true },
    orderBy: { scheduledStart: "asc" },
    take: 100,
  });
}

function AppointmentRow({ a, showDate }: { a: AppointmentRowData; showDate?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-xs">
      <span className="w-36 shrink-0 text-sm tabular-nums text-gray-500">
        {showDate ? `${shortDate(a.scheduledStart)} · ` : ""}
        {timeRange(a.scheduledStart, a.scheduledEnd)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{a.title}</p>
        <p className="truncate text-xs text-gray-500">
          {a.company.name}
          {a.ticket && (
            <>
              {" · "}
              <RowLink href={`/tickets/${a.ticket.id}`}>#{a.ticket.id}</RowLink>
            </>
          )}
          {a.address ? ` · ${a.address}` : ""}
        </p>
      </div>
      <span className="flex items-center gap-1.5 text-xs text-gray-600">
        <Icon name="wrench" className="h-3.5 w-3.5 text-gray-500" />
        {a.tech.name}
      </span>
      <Badge map={APPOINTMENT_STATUSES} value={a.status} />
      <form action={setAppointmentStatus} className="flex items-center gap-1.5">
        <input type="hidden" name="appointmentId" value={a.id} />
        <label className="sr-only" htmlFor={`status-${a.id}`}>Change status</label>
        <select id={`status-${a.id}`} className="input w-32 py-1.5 text-xs" name="status" defaultValue={a.status}>
          {Object.entries(APPOINTMENT_STATUSES).map(([value, s]) => (
            <option key={value} value={value}>{s.label}</option>
          ))}
        </select>
        <button className="btn-secondary px-2.5 py-1.5 text-xs" type="submit">Set</button>
      </form>
    </div>
  );
}

export default async function SchedulePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, isStaff } = await portalContext(params);
  if (!isStaff) redirect("/");

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [appointments, overdue, team, companies, openTickets] = await Promise.all([
    getAppointments(tenant.id, { scheduledStart: { gte: dayStart } }),
    // Past visits nobody completed or canceled — they must not silently vanish.
    getAppointments(tenant.id, {
      scheduledStart: { lt: dayStart },
      status: { in: ["SCHEDULED", "EN_ROUTE", "ON_SITE"] },
    }),
    db.user.findMany({
      where: { tenantId: tenant.id, active: true, role: { in: [...SEAT_ROLES] } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    db.clientCompany.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
    db.ticket.findMany({
      where: { tenantId: tenant.id, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT"] } },
      include: { company: true },
      orderBy: { id: "desc" },
    }),
  ]);

  const byDay = new Map<string, typeof appointments>();
  for (const appointment of appointments) {
    const key = dayKey(appointment.scheduledStart);
    byDay.set(key, [...(byDay.get(key) ?? []), appointment]);
  }

  return (
    <div>
      <PageHeader
        title="Schedule"
        subtitle="Dispatch board — every upcoming visit across your team."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-red-600">
                <Icon name="alert" className="h-4 w-4" />
                Needs attention — past visits never completed
              </h2>
              <div className="space-y-2">
                {overdue.map((a) => (
                  <AppointmentRow key={a.id} a={a} showDate />
                ))}
              </div>
            </div>
          )}

          {byDay.size === 0 && overdue.length === 0 ? (
            <EmptyState message="Nothing scheduled — book the first visit on the right." icon="calendar" />
          ) : (
            [...byDay.entries()].map(([key, dayAppointments]) => (
              <div key={key}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  {dayLabel(dayAppointments[0].scheduledStart)}
                </h2>
                <div className="space-y-2">
                  {dayAppointments.map((a) => (
                    <AppointmentRow key={a.id} a={a} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <Card title="Book a visit">
            {team.length === 0 ? (
              <p className="text-sm text-gray-500">Add team members first (Team page).</p>
            ) : (
              <form action={createAppointment} className="space-y-4">
                <div>
                  <label className="label" htmlFor="visit-tech">Assign to</label>
                  <select id="visit-tech" className="input" name="techId" required>
                    {team.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({ROLES[member.role as Role] ?? member.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="visit-company">Client</label>
                  <select id="visit-company" className="input" name="companyId" required>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="visit-ticket">Link ticket (optional — overrides client)</label>
                  <select id="visit-ticket" className="input" name="ticketId" defaultValue="">
                    <option value="">None</option>
                    {openTickets.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.id} · {t.company.name} · {t.subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="visit-title">What&apos;s the visit for?</label>
                  <input id="visit-title" className="input" name="title" required placeholder="Quarterly maintenance check" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="min-w-0">
                    <label className="label" htmlFor="visit-date">Date</label>
                    <input id="visit-date" className="input" name="date" type="date" required />
                  </div>
                  <div className="min-w-0">
                    <label className="label" htmlFor="visit-time">Start</label>
                    <input id="visit-time" className="input" name="time" type="time" required />
                  </div>
                  <div className="min-w-0">
                    <label className="label" htmlFor="visit-duration">Duration</label>
                    <select id="visit-duration" className="input" name="duration" defaultValue="60">
                      {DURATIONS.map((d) => (
                        <option key={d.minutes} value={d.minutes}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="visit-address">Address (defaults to the client&apos;s address)</label>
                  <input id="visit-address" className="input" name="address" placeholder="123 Main St, Springfield" />
                </div>
                <div>
                  <label className="label" htmlFor="visit-notes">Notes for the tech</label>
                  <textarea id="visit-notes" className="input" name="notes" rows={2} placeholder="Gate code, contact on site…" />
                </div>
                <button className="btn-brand w-full" type="submit">
                  <Icon name="plus" className="h-4 w-4" />
                  Book visit
                </button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
