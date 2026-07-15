import { techContext } from "@/lib/portal";
import { portalLogout } from "@/lib/actions";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/icons";
import { NavLink } from "@/components/nav-link";

// Mobile-first field portal for technicians: sticky brand header, big touch
// targets, and a fixed bottom tab bar. Works fine on desktop too, capped to a
// phone-ish column.
export default async function TechLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  // Suspended/expired tenants: techContext -> portalContext redirects
  // technicians to /locked before this layout ever renders.
  const { tenant, user } = await techContext(params);

  const TAB_CLASS =
    "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium text-gray-500 transition-colors";
  const TAB_ACTIVE = "!text-[var(--brand-strong)] bg-[var(--brand-soft)]";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-gray-50">
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 text-[var(--brand-fg,#fff)] shadow-sm"
        style={{
          background: `linear-gradient(120deg, var(--brand), color-mix(in srgb, var(--brand) 72%, black))`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-fg,#fff)_15%,transparent)]">
            <Icon name="wrench" className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">{tenant.name}</p>
            <p className="text-[11px] opacity-85">Field portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Avatar
            name={user.name}
            className="h-9 w-9 text-xs !bg-[color-mix(in_srgb,var(--brand-fg,#fff)_15%,transparent)] !text-[var(--brand-fg,#fff)]"
          />
          <form action={portalLogout}>
            <button
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-fg,#fff)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--brand-fg,#fff)_20%,transparent)]"
              type="submit"
              title="Sign out"
              aria-label="Sign out"
            >
              <Icon name="log-out" className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-5">{children}</main>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg gap-1 px-3 py-2">
          <NavLink href="/tech" exact className={TAB_CLASS} activeClassName={TAB_ACTIVE}>
            <Icon name="home" className="h-5 w-5" />
            Today
          </NavLink>
          <NavLink href="/tech/schedule" className={TAB_CLASS} activeClassName={TAB_ACTIVE}>
            <Icon name="calendar" className="h-5 w-5" />
            Schedule
          </NavLink>
          <NavLink href="/tech/tickets" className={TAB_CLASS} activeClassName={TAB_ACTIVE}>
            <Icon name="message" className="h-5 w-5" />
            Tickets
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
