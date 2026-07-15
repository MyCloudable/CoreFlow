import { db } from "@/lib/db";
import { techContext } from "@/lib/portal";
import { AppointmentCard } from "../appointment-card";
import { EmptyState } from "@/components/ui";
import { dayKey, dayLabel } from "@/lib/format";

export default async function TechSchedulePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, user } = await techContext(params);

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Calendar-field math (not +24h*14) so DST-change days stay correct.
  const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);

  const [overdue, upcoming] = await Promise.all([
    // Past visits that never got completed — surfaced so nothing falls through.
    db.appointment.findMany({
      where: {
        tenantId: tenant.id,
        techId: user.id,
        scheduledStart: { lt: dayStart },
        status: { in: ["SCHEDULED", "EN_ROUTE", "ON_SITE"] },
      },
      include: { company: true, ticket: true },
      orderBy: { scheduledStart: "asc" },
    }),
    db.appointment.findMany({
      where: {
        tenantId: tenant.id,
        techId: user.id,
        scheduledStart: { gte: dayStart, lt: horizon },
        status: { not: "CANCELED" },
      },
      include: { company: true, ticket: true },
      orderBy: { scheduledStart: "asc" },
    }),
  ]);

  const byDay = new Map<string, typeof upcoming>();
  for (const appointment of upcoming) {
    const key = dayKey(appointment.scheduledStart);
    byDay.set(key, [...(byDay.get(key) ?? []), appointment]);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-gray-900">Schedule</h1>
      <p className="mt-0.5 text-sm text-gray-500">Your visits for the next two weeks.</p>

      {overdue.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-600">
            Needs attention
          </h2>
          <div className="space-y-3">
            {overdue.map((a) => (
              <AppointmentCard key={a.id} appointment={a} />
            ))}
          </div>
        </div>
      )}

      {byDay.size === 0 && overdue.length === 0 ? (
        <div className="mt-6">
          <EmptyState message="No upcoming visits scheduled." icon="calendar" />
        </div>
      ) : (
        [...byDay.entries()].map(([key, appointments]) => (
          <div key={key} className="mt-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              {dayLabel(appointments[0].scheduledStart)}
            </h2>
            <div className="space-y-3">
              {appointments.map((a) => (
                <AppointmentCard key={a.id} appointment={a} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
