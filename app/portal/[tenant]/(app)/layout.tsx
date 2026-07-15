import Link from "next/link";
import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { portalLogout } from "@/lib/actions";
import { trialDaysLeft, trialExpired } from "@/lib/billing";
import { ROLES, type Role } from "@/lib/constants";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/icons";
import { NavLink } from "@/components/nav-link";
import { MobileNav, type NavItem } from "@/components/mobile-nav";

const WORK_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "grid", exact: true },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/deliverables", label: "Deliverables", icon: "package" },
  { href: "/tickets", label: "Tickets", icon: "message" },
  { href: "/orders", label: "Orders", icon: "file-text" },
  { href: "/reports", label: "Reports", icon: "chart" },
];

const STAFF_NAV: NavItem[] = [
  { href: "/schedule", label: "Schedule", icon: "calendar" },
  { href: "/clients", label: "Clients", icon: "users" },
];

const OWNER_NAV: NavItem[] = [
  { href: "/team", label: "Team", icon: "user-plus" },
  { href: "/settings", label: "Settings", icon: "sliders" },
  { href: "/billing", label: "Billing", icon: "credit-card" },
];

const LINK_CLASS =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900";
const ACTIVE_CLASS = "bg-[var(--brand-soft)] !text-[var(--brand-strong)]";

function NavSection({ label, items }: { label?: string; items: NavItem[] }) {
  return (
    <div>
      {label && (
        <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </p>
      )}
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            exact={item.exact}
            className={LINK_CLASS}
            activeClassName={ACTIVE_CLASS}
          >
            <Icon name={item.icon} className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function TenantMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain" />
  ) : (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-[var(--brand-fg,#fff)] shadow-sm"
      style={{ background: "var(--brand)" }}
    >
      {name.charAt(0)}
    </div>
  );
}

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant, user, isStaff, isOwner, isTech } = await portalContext(params);

  // Technicians work from the mobile field portal.
  if (isTech) redirect("/tech");

  // Non-owner lockout for suspended/expired tenants happens in portalContext
  // (redirect to /locked) — by the time we render here, this user is allowed.
  const expired = trialExpired(tenant);
  const suspended = tenant.planStatus === "SUSPENDED";
  const daysLeft = trialDaysLeft(tenant);

  const nav = (
    <>
      <NavSection items={WORK_NAV} />
      {isStaff && <NavSection label="Manage" items={STAFF_NAV} />}
      {isOwner && <NavSection label="Workspace" items={OWNER_NAV} />}
    </>
  );

  const allItems = [...WORK_NAV, ...(isStaff ? STAFF_NAV : []), ...(isOwner ? OWNER_NAV : [])];

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-200/80 bg-white lg:flex">
        <div className="flex items-center gap-3 px-4 py-4">
          <TenantMark name={tenant.name} logoUrl={tenant.logoUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{tenant.name}</p>
            <p className="text-[11px] text-gray-500">Client Portal</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3">{nav}</nav>

        <div className="flex items-center gap-3 border-t border-gray-100 p-3">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-[11px] text-gray-500">{ROLES[user.role as Role] ?? user.role}</p>
          </div>
          <form action={portalLogout}>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              type="submit"
              title="Sign out"
              aria-label="Sign out"
            >
              <Icon name="log-out" className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2.5">
            <TenantMark name={tenant.name} logoUrl={tenant.logoUrl} />
            <span className="text-sm font-semibold text-gray-900">{tenant.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <form action={portalLogout}>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500"
                type="submit"
                title="Sign out"
                aria-label="Sign out"
              >
                <Icon name="log-out" className="h-4 w-4" />
              </button>
            </form>
            <MobileNav items={allItems} tenantName={tenant.name} />
          </div>
        </header>

        {/* Billing state banners */}
        {suspended && isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-red-600 px-4 py-2.5 text-sm text-white lg:px-8">
            <span className="flex items-center gap-2">
              <Icon name="alert" className="h-4 w-4" />
              Your subscription has ended — your team and clients are locked out until you resubscribe.
            </span>
            <Link href="/billing" className="rounded-md bg-white/15 px-3 py-1 font-medium hover:bg-white/25">
              Set up billing →
            </Link>
          </div>
        )}
        {expired && isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-red-600 px-4 py-2.5 text-sm text-white lg:px-8">
            <span className="flex items-center gap-2">
              <Icon name="alert" className="h-4 w-4" />
              Your free trial has ended — your team and clients are locked out until you subscribe.
            </span>
            <Link href="/billing" className="rounded-md bg-white/15 px-3 py-1 font-medium hover:bg-white/25">
              Set up billing →
            </Link>
          </div>
        )}
        {!expired && tenant.planStatus === "TRIAL" && daysLeft > 0 && isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--brand)] px-4 py-2.5 text-sm text-[var(--brand-fg,#fff)] lg:px-8">
            <span>
              <strong>{daysLeft} day{daysLeft === 1 ? "" : "s"}</strong> left in your free trial.
            </span>
            <Link
              href="/billing"
              className="rounded-md bg-[color-mix(in_srgb,var(--brand-fg,#fff)_15%,transparent)] px-3 py-1 font-medium hover:bg-[color-mix(in_srgb,var(--brand-fg,#fff)_25%,transparent)]"
            >
              Set up billing →
            </Link>
          </div>
        )}
        {tenant.planStatus === "PAST_DUE" && isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-red-600 px-4 py-2.5 text-sm text-white lg:px-8">
            <span className="flex items-center gap-2">
              <Icon name="alert" className="h-4 w-4" />
              Your last payment failed — please update your payment method.
            </span>
            <Link href="/billing" className="rounded-md bg-white/15 px-3 py-1 font-medium hover:bg-white/25">
              Fix billing →
            </Link>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
