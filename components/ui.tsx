import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";

export function Badge({ map, value }: { map: Record<string, { label: string; badge: string }>; value: string }) {
  const entry = map[value] ?? { label: value, badge: "bg-gray-100 text-gray-700" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-black/5 ${entry.badge}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {entry.label}
    </span>
  );
}

export function Card({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200/80 bg-white shadow-xs">
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 lg:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: IconName;
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-strong)]">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full max-w-40 overflow-hidden rounded-full bg-gray-200/80">
        <div
          className="h-full rounded-full bg-[var(--brand)] transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-gray-500">{clamped}%</span>
    </div>
  );
}

export function EmptyState({ message, icon = "inbox" }: { message: string; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-xs">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80">
            {headers.map((h, i) => (
              <th
                key={`${h}-${i}`}
                className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}

export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-gray-900 hover:text-[var(--brand)] hover:underline">
      {children}
    </Link>
  );
}

export function Avatar({ name, className = "h-8 w-8 text-xs" }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] font-semibold text-[var(--brand-strong)] ${className}`}
    >
      {initials}
    </span>
  );
}
