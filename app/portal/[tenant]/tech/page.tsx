import Link from "next/link";
import { db } from "@/lib/db";
import { techContext } from "@/lib/portal";
import { AppointmentCard } from "./appointment-card";
import { EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";

export default async function TechTodayPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, user } = await techContext(params);

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Calendar-field math (not +24h) so DST-change days stay correct.
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [appointments, openTickets] = await Promise.all([
    db.appointment.findMany({
      where: {
        tenantId: tenant.id,
        techId: user.id,
        scheduledStart: { gte: dayStart, lt: dayEnd },
        status: { not: "CANCELED" },
      },
      include: { company: true, ticket: true },
      orderBy: { scheduledStart: "asc" },
    }),
    db.ticket.count({
      where: {
        tenantId: tenant.id,
        assignedToId: user.id,
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT"] },
      },
    }),
  ]);

  const remaining = appointments.filter((a) => a.status !== "COMPLETED").length;
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div>
      <p className="text-sm text-gray-500">{dateLabel}</p>
      <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-gray-900">
        Hi {user.name.split(" ")[0]} 👋
      </h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
          <p className="text-2xl font-semibold tabular-nums text-gray-900">{remaining}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {remaining === 1 ? "visit" : "visits"} left today
          </p>
        </div>
        <Link
          href="/tech/tickets"
          className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs active:bg-gray-50"
        >
          <p className="text-2xl font-semibold tabular-nums text-gray-900">{openTickets}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            open tickets <Icon name="chevron-right" className="h-3 w-3" />
          </p>
        </Link>
      </div>

      <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-gray-500">
        Today&apos;s schedule
      </h2>
      {appointments.length === 0 ? (
        <EmptyState message="Nothing scheduled today. Enjoy the quiet — or check your tickets." icon="calendar" />
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <AppointmentCard key={a.id} appointment={a} />
          ))}
        </div>
      )}
    </div>
  );
}
