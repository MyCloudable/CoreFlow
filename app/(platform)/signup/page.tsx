import Link from "next/link";
import { signupTenant } from "@/lib/actions";
import { FoxMark } from "@/components/logo";

export const metadata = { title: "Start your free trial — ServiceFox" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const rootDomain = process.env.ROOT_DOMAIN ?? "localhost:3000";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2">
          <FoxMark className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-gray-900">
            Service<span className="text-orange-600">Fox</span>
          </span>
        </Link>
        <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900">
          ← Back
        </Link>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Start your 14-day free trial
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Your branded portal is live in about a minute. No credit card required.
        </p>

        <form action={signupTenant} className="mt-8 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div>
            <label className="label" htmlFor="su-name">Business name</label>
            <input id="su-name" className="input" name="name" required placeholder="Acme Field Services" />
          </div>
          <div>
            <label className="label" htmlFor="su-slug">Your portal address</label>
            <div className="flex items-center gap-1.5">
              <input
                id="su-slug"
                className="input"
                name="slug"
                required
                placeholder="acme"
                pattern="[a-z0-9][a-z0-9-]*"
                title="Lowercase letters, numbers, and hyphens"
              />
              <span className="shrink-0 text-sm text-gray-500">.{rootDomain}</span>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="su-owner">Your name</label>
            <input id="su-owner" className="input" name="ownerName" required autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="su-email">Work email</label>
            <input id="su-email" className="input" name="ownerEmail" type="email" required autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="su-password">Password (8+ characters)</label>
            <input id="su-password" className="input" name="ownerPassword" type="password" required minLength={8} autoComplete="new-password" />
          </div>

          {/* Honeypot — hidden from humans, tempting to bots */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="su-hp">Company website</label>
            <input id="su-hp" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <button className="btn-brand w-full !bg-orange-600 hover:!bg-orange-700" type="submit">
            Create my portal
          </button>
          <p className="text-center text-xs text-gray-500">
            14 days free, then $99/mo. Cancel anytime — your data stays yours.
          </p>
        </form>
      </main>
    </div>
  );
}
