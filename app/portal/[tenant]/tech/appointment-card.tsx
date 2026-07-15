import Link from "next/link";
import type { Appointment, ClientCompany, Ticket } from "@prisma/client";
import { setAppointmentStatus } from "@/lib/actions";
import { APPOINTMENT_STATUSES } from "@/lib/constants";
import { timeRange } from "@/lib/format";
import { Badge } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";

const NEXT_ACTION: Record<string, { status: string; label: string; icon: IconName } | undefined> = {
  SCHEDULED: { status: "EN_ROUTE", label: "On my way", icon: "navigation" },
  EN_ROUTE: { status: "ON_SITE", label: "Arrived on site", icon: "map-pin" },
  ON_SITE: { status: "COMPLETED", label: "Complete job", icon: "check" },
};

export function AppointmentCard({
  appointment,
}: {
  appointment: Appointment & { company: ClientCompany; ticket: Ticket | null };
}) {
  const action = NEXT_ACTION[appointment.status];
  const done = appointment.status === "COMPLETED" || appointment.status === "CANCELED";

  return (
    <div className={`rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs ${done ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Icon name="clock" className="h-3.5 w-3.5" />
            {timeRange(appointment.scheduledStart, appointment.scheduledEnd)}
          </p>
          <h3 className="mt-1 font-semibold leading-snug text-gray-900">{appointment.title}</h3>
          <p className="mt-0.5 text-sm text-gray-600">{appointment.company.name}</p>
        </div>
        <Badge map={APPOINTMENT_STATUSES} value={appointment.status} />
      </div>

      {appointment.address && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.address)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700 active:bg-gray-100"
        >
          <Icon name="map-pin" className="h-4 w-4 shrink-0 text-[var(--brand)]" />
          <span className="min-w-0 truncate">{appointment.address}</span>
          <Icon name="arrow-up-right" className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-400" />
        </a>
      )}

      {appointment.notes && (
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-amber-50/70 px-3 py-2.5 text-sm text-amber-900">
          {appointment.notes}
        </p>
      )}

      {appointment.ticket && (
        <Link
          href={`/tech/tickets/${appointment.ticket.id}`}
          className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-700 active:bg-gray-100"
        >
          <Icon name="message" className="h-4 w-4 shrink-0 text-[var(--brand)]" />
          <span className="min-w-0 truncate">
            Ticket #{appointment.ticket.id} · {appointment.ticket.subject}
          </span>
          <Icon name="chevron-right" className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
        </Link>
      )}

      {action && (
        <form action={setAppointmentStatus} className="mt-4">
          <input type="hidden" name="appointmentId" value={appointment.id} />
          <input type="hidden" name="status" value={action.status} />
          <button className="btn-brand btn-lg w-full" type="submit">
            <Icon name={action.icon} className="h-5 w-5" />
            {action.label}
          </button>
        </form>
      )}
    </div>
  );
}
