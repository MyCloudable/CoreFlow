import Link from "next/link";
import { db } from "@/lib/db";
import { portalContext, companyScope } from "@/lib/portal";
import { Badge, Card, PageHeader, ProgressBar, StatCard, EmptyState, RowLink } from "@/components/ui";
import { Icon } from "@/components/icons";
import { APPOINTMENT_STATUSES, TICKET_STATUSES, DELIVERABLE_STATUSES } from "@/lib/constants";
import { dateTime, dayLabel, timeRange } from "@/lib/format";

export default async function DashboardPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, user, isStaff } = await portalContext(params);
  const scope = companyScope(user);

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [openTickets, activeProjects, pendingOrders, recentTickets, projects, deliverables, clientCount, visits] =
    await Promise.all([
      db.ticket.count({
        where: { tenantId: tenant.id, ...scope, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT"] } },
      }),
      db.project.count({ where: { tenantId: tenant.id, ...scope, status: "ACTIVE" } }),
      db.order.count({ where: { tenantId: tenant.id, ...scope, status: "PENDING" } }),
      db.ticket.findMany({
        where: { tenantId: tenant.id, ...scope },
        include: { company: true },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      db.project.findMany({
        where: { tenantId: tenant.id, ...scope, status: "ACTIVE" },
        include: { milestones: true, company: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.deliverable.findMany({
        where: { tenantId: tenant.id, ...scope },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      isStaff ? db.clientCompany.count({ where: { tenantId: tenant.id } }) : Promise.resolve(0),
      // Staff: today's dispatch. Clients: their upcoming visits.
      db.appointment.findMany({
        where: {
          tenantId: tenant.id,
          ...scope,
          status: { notIn: ["CANCELED", "COMPLETED"] },
          // Calendar-field math (not +24h) so DST-change days stay correct.
          scheduledStart: isStaff
            ? { gte: dayStart, lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) }
            : { gte: dayStart },
        },
        include: { company: true, tech: true },
        orderBy: { scheduledStart: "asc" },
        take: 5,
      }),
    ]);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        subtitle={isStaff ? "Everything across your clients at a glance." : "Here's where your work stands."}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open tickets" value={openTickets} icon="message" />
        <StatCard label="Active projects" value={activeProjects} icon="folder" />
        <StatCard
          label="Pending orders"
          value={pendingOrders}
          hint={isStaff ? "Awaiting client approval" : "Awaiting your approval"}
          icon="file-text"
        />
        {isStaff ? (
          <StatCard label="Clients" value={clientCount} icon="users" />
        ) : (
          <StatCard label="Recent deliverables" value={deliverables.length} icon="package" />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title={isStaff ? "Today's visits" : "Upcoming visits"}
          action={
            isStaff ? (
              <Link href="/schedule" className="text-xs font-medium text-[var(--brand)] hover:underline">
                Open schedule
              </Link>
            ) : undefined
          }
        >
          {visits.length === 0 ? (
            <EmptyState message={isStaff ? "No visits scheduled today." : "No visits scheduled."} icon="calendar" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {visits.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{v.title}</p>
                    <p className="text-xs text-gray-500">
                      {dayLabel(v.scheduledStart)} · {timeRange(v.scheduledStart, v.scheduledEnd)}
                      {isStaff ? ` · ${v.company.name} · ${v.tech.name}` : ` · ${v.tech.name}`}
                    </p>
                  </div>
                  <Badge map={APPOINTMENT_STATUSES} value={v.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent tickets"
          action={<Link href="/tickets" className="text-xs font-medium text-[var(--brand)] hover:underline">View all</Link>}
        >
          {recentTickets.length === 0 ? (
            <EmptyState message="No tickets yet." icon="message" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentTickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <RowLink href={`/tickets/${t.id}`}>#{t.id} · {t.subject}</RowLink>
                    <p className="text-xs text-gray-500">
                      {isStaff ? `${t.company.name} · ` : ""}Updated {dateTime(t.updatedAt)}
                    </p>
                  </div>
                  <Badge map={TICKET_STATUSES} value={t.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Active projects"
          action={<Link href="/projects" className="text-xs font-medium text-[var(--brand)] hover:underline">View all</Link>}
        >
          {projects.length === 0 ? (
            <EmptyState message="No active projects." icon="folder" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {projects.map((p) => {
                const total = p.milestones.length;
                const done = p.milestones.filter((m) => m.done).length;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-4 py-2.5">
                    <div className="min-w-0">
                      <RowLink href={`/projects/${p.id}`}>{p.name}</RowLink>
                      {isStaff && <p className="text-xs text-gray-500">{p.company.name}</p>}
                    </div>
                    <ProgressBar percent={total ? (done / total) * 100 : 0} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card
          title="Latest deliverables"
          action={<Link href="/deliverables" className="text-xs font-medium text-[var(--brand)] hover:underline">View all</Link>}
        >
          {deliverables.length === 0 ? (
            <EmptyState message="Nothing delivered yet." icon="package" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {deliverables.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="truncate text-sm font-medium text-gray-900">{d.title}</span>
                  <Badge map={DELIVERABLE_STATUSES} value={d.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/tickets/new" className="btn-brand">
          <Icon name="plus" className="h-4 w-4" />
          New ticket
        </Link>
        <Link href="/orders" className="btn-secondary">{isStaff ? "Manage orders" : "Review orders"}</Link>
        <Link href="/reports" className="btn-secondary">Reports</Link>
        {isStaff && <Link href="/clients" className="btn-secondary">Clients</Link>}
      </div>
    </div>
  );
}
