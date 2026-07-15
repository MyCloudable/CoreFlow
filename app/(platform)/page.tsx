import Link from "next/link";
import { FoxMark, Wordmark } from "@/components/logo";
import { Icon, type IconName } from "@/components/icons";

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "users",
    title: "Your brand, front and center",
    body: "Every client logs into a portal with your name, your logo, your colors, on your subdomain. ServiceFox stays invisible.",
  },
  {
    icon: "calendar",
    title: "Dispatch & scheduling",
    body: "Book visits from the dispatch board, assign your team, link tickets — clients see upcoming visits with live status.",
  },
  {
    icon: "wrench",
    title: "A field portal techs actually use",
    body: "Today's jobs, one-tap On-my-way → On-site → Done, map links, and job notes — built for a phone in one hand.",
  },
  {
    icon: "message",
    title: "Service tickets",
    body: "A real queue with priorities, assignments, and threaded replies — no more requests lost in text messages.",
  },
  {
    icon: "file-text",
    title: "Work orders clients approve",
    body: "Send line-item work orders; clients approve with one click in their portal. No chasing, no ambiguity.",
  },
  {
    icon: "chart",
    title: "Projects, deliverables & reports",
    body: "Milestone progress bars, deliverables with sign-off, and polished published reports — clients stop asking for updates.",
  },
];

const STEPS = [
  { n: "1", title: "Create your portal", body: "Pick your subdomain, set your logo and brand color. Live in about a minute." },
  { n: "2", title: "Add your team & clients", body: "Techs get the mobile field portal. Every client gets a free branded login." },
  { n: "3", title: "Run your operations in it", body: "Tickets, visits, work orders, reports. The portal becomes how your business runs." },
];

const FAQS = [
  {
    q: "Do my clients pay anything?",
    a: "Never. Client logins are unlimited and free on every plan. You only pay for your own team's seats.",
  },
  {
    q: "Will my clients see ServiceFox anywhere?",
    a: "No. Your portal runs under your name, your logo, and your brand color. White-labeling is included in the base price, not sold as a premium tier.",
  },
  {
    q: "What counts as a seat?",
    a: "Your team: owners, office staff, and technicians. Your plan includes 2 seats; each additional seat is $19/month, and deactivated members stop counting immediately.",
  },
  {
    q: "Do technicians need to install an app?",
    a: "No — the field portal runs in the phone's browser at your portal address. Nothing to install or update.",
  },
  {
    q: "What happens after the 14-day trial?",
    a: "Add a payment method any time during the trial — you're not charged until it ends. If you don't subscribe, your portal pauses but your data is kept safe.",
  },
  {
    q: "Can I cancel?",
    a: "Any time, from the billing page. No contracts, no cancellation calls.",
  },
];

function CTAButton({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/signup"
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-orange-700 active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark />
          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 sm:flex">
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#pricing" className="hover:text-gray-900">Pricing</a>
            <a href="#faq" className="hover:text-gray-900">FAQ</a>
          </nav>
          <Link
            href="/signup"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Start free trial
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 text-center sm:pt-24">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm font-medium text-orange-700">
            <FoxMark className="h-4 w-4" />
            White-label portals for service businesses
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Give every client a portal with <span className="text-orange-600">your name on it</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            Tickets, scheduled visits, work orders, projects, and reports — in a branded portal
            your clients log into, and a mobile field portal your technicians work from.
            You look bigger. Clients stop calling for updates. Nobody leaves.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CTAButton>
              Create your portal — free for 14 days
              <Icon name="chevron-right" className="h-4 w-4" />
            </CTAButton>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            No credit card required · Live in about a minute · Unlimited free client logins
          </p>
        </section>

        {/* Product strip — honest, spec-style */}
        <section className="border-y border-gray-100 bg-gray-50">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-8 text-center sm:grid-cols-4">
            {[
              ["1 minute", "from signup to a live branded portal"],
              ["Unlimited", "free client logins on every plan"],
              ["3 portals in 1", "client portal · dispatch board · tech mobile"],
              ["$0", "for white-labeling — it's included"],
            ].map(([big, small]) => (
              <div key={big as string}>
                <p className="text-2xl font-bold tracking-tight text-gray-900">{big}</p>
                <p className="mt-1 text-xs text-gray-500">{small}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Everything your clients touch, under your brand
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">
            One system for the office, the field, and the client — so you stop juggling
            spreadsheets, text threads, and “just checking in” calls.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-200 p-6 transition-shadow hover:shadow-md">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-gray-100 bg-gray-50 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
              Live before your coffee cools
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="text-center">
                  <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-lg font-bold text-white">
                    {s.n}
                  </span>
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            One plan. No games.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">
            Comparable tools charge $29–65 per user and sell white-labeling as a premium tier.
            We don&apos;t.
          </p>
          <div className="mx-auto mt-12 max-w-lg overflow-hidden rounded-3xl border-2 border-orange-600 shadow-xl">
            <div className="bg-orange-600 px-8 py-3 text-center text-sm font-semibold text-white">
              14-day free trial · no credit card
            </div>
            <div className="bg-white p-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold tracking-tight text-gray-900">$99</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="mt-2 text-center text-sm text-gray-500">
                includes 2 team seats · additional seats <span className="font-semibold text-gray-900">$19/mo</span>
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Unlimited clients — their logins are always free",
                  "Full white-labeling: your domain slug, logo & colors",
                  "Client portal, dispatch board & technician mobile portal",
                  "Tickets, visits, work orders, projects, deliverables, reports",
                  "Seats adjust automatically as your team changes",
                  "Cancel anytime — your data stays yours",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/signup"
                  className="flex w-full items-center justify-center rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700"
                >
                  Start your free trial
                </Link>
              </div>
              <p className="mt-3 text-center text-xs text-gray-500">
                A 5-person shop pays $156/mo — the same team costs $189+ elsewhere, without white-labeling.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-gray-100 bg-gray-50 px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
              Questions, answered
            </h2>
            <div className="mt-10 space-y-4">
              {FAQS.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-gray-200 bg-white p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-gray-900">
                    {f.q}
                    <Icon name="chevron-right" className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-20 text-center">
          <FoxMark className="mx-auto mb-5 h-14 w-14" />
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Your clients are asking for updates right now.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            Give them a portal with your name on it instead — free for 14 days.
          </p>
          <div className="mt-8">
            <CTAButton>Create your portal</CTAButton>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        ServiceFox · Tenant portals live at yourname.{process.env.ROOT_DOMAIN ?? "localhost:3000"} ·{" "}
        <Link href="/admin" className="hover:text-gray-600">Platform admin</Link>
      </footer>
    </div>
  );
}
