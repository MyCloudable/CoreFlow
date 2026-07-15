import { NextRequest, NextResponse } from "next/server";

// Host-based routing:
//   root domain            -> landing page + /admin (platform console, that's us)
//   <slug>.<root domain>   -> that tenant's branded portal (internally /portal/<slug>/...)
// The browser URL stays clean (acme.example.com/tickets); the rewrite adds the
// tenant segment so pages receive it as a route param.
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const root = (process.env.ROOT_DOMAIN ?? "localhost:3000").toLowerCase();
  const { pathname } = req.nextUrl;

  // Never allow hitting the internal /portal/* paths directly.
  if (pathname.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const isRoot = host === root || host === `www.${root}`;
  if (isRoot) return NextResponse.next();

  if (host.endsWith(`.${root}`)) {
    const slug = host.slice(0, -(root.length + 1));
    if (slug && slug !== "www" && !slug.includes(".")) {
      const url = req.nextUrl.clone();
      url.pathname = `/portal/${slug}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, API routes (Stripe webhooks must not be rewritten),
  // and static assets (anything with a file extension).
  matcher: ["/((?!_next|api|favicon\\.ico|.*\\..*).*)"],
};
