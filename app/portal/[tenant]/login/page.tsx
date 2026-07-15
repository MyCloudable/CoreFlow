import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { portalLogin } from "@/lib/actions";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenant: slug } = await params;
  const { error } = await searchParams;
  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant) redirect("/");

  const user = await getCurrentUser();
  if (user && user.tenantId === tenant.id) redirect(user.role === "TECH" ? "/tech" : "/");

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div
        className="relative hidden flex-1 flex-col justify-between p-10 text-[var(--brand-fg,#fff)] lg:flex"
        style={{
          background: `linear-gradient(140deg, var(--brand), color-mix(in srgb, var(--brand) 65%, black))`,
        }}
      >
        <div className="flex items-center gap-3">
          {tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logoUrl} alt="" className="h-10 w-10 rounded-xl bg-white/10 object-contain p-1" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-fg,#fff)_15%,transparent)] text-lg font-bold">
              {tenant.name.charAt(0)}
            </div>
          )}
          <span className="text-lg font-semibold">{tenant.name}</span>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Everything we&apos;re working on together, in one place.
          </h2>
          <p className="mt-3 max-w-md text-sm opacity-85">
            Deliverables, project progress, support tickets, orders, and reports — always up to date.
          </p>
        </div>
        <p className="text-xs opacity-80">Powered by {tenant.name}</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-gray-50 p-6 lg:max-w-xl">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-4 flex justify-center lg:hidden">
              {tenant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logoUrl} alt={tenant.name} className="h-12 w-auto" />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-[var(--brand-fg,#fff)] shadow-md"
                  style={{ background: "var(--brand)" }}
                >
                  {tenant.name.charAt(0)}
                </div>
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500">Sign in to the {tenant.name} portal</p>
          </div>

          <form action={portalLogin} className="space-y-4 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Invalid email or password.
              </p>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input className="input" id="email" name="email" type="email" autoComplete="email" required autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <button className="btn-brand w-full" type="submit">Sign in</button>
          </form>

          {tenant.supportEmail && (
            <p className="mt-5 text-center text-xs text-gray-500">
              Need help? Contact <a className="font-medium text-[var(--brand)] hover:underline" href={`mailto:${tenant.supportEmail}`}>{tenant.supportEmail}</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
