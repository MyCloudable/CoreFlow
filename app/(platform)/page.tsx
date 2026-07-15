import Link from "next/link";

const FEATURES = [
  { title: "Your brand, front and center", body: "Each client logs into a portal with your logo, your colors, your domain. They never see our name." },
  { title: "Deliverables & approvals", body: "Ship work, track delivery status, and collect client sign-off in one place." },
  { title: "Service tickets", body: "A real ticketing queue with priorities, assignments, and threaded replies." },
  { title: "Projects & progress", body: "Milestone-based progress bars your clients can check any time — no more status-update emails." },
  { title: "Orders & reports", body: "Send work orders for approval and publish polished client reports." },
  { title: "Simple seat pricing", body: "$99/mo base + $5/mo per team member. Unlimited clients, always free for them." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold text-gray-900">Portal Platform</span>
        <Link href="/admin" className="text-sm font-medium text-indigo-600 hover:underline">
          Platform admin →
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            The white-label client portal for agencies, coaches & consultants
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
            Give every client a branded home for deliverables, project progress, service tickets,
            orders, and reports — and become operational infrastructure they can&apos;t leave.
          </p>
          <p className="mt-8 inline-block rounded-full bg-indigo-50 px-5 py-2 text-sm font-semibold text-indigo-700">
            $99/mo base · $5/mo per employee · unlimited free client logins
          </p>
        </section>

        <section className="grid gap-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        Tenant portals live at yourname.{process.env.ROOT_DOMAIN ?? "localhost:3000"}
      </footer>
    </div>
  );
}
