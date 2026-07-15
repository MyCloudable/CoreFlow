import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

export function rootDomain(): string {
  return process.env.ROOT_DOMAIN ?? "localhost:3000";
}

/** Extract the tenant slug from a request host, or null for the root domain. */
export function slugFromHost(host: string): string | null {
  const root = rootDomain();
  if (host === root || host === `www.${root}`) return null;
  if (host.endsWith(`.${root}`)) {
    const slug = host.slice(0, -(root.length + 1));
    if (slug && slug !== "www" && !slug.includes(".")) return slug;
  }
  return null;
}

/** Resolve the tenant for the current request from the Host header.
 *  Used by server actions so tenant identity is never trusted from form data. */
export async function getTenantFromRequest() {
  const h = await headers();
  const slug = slugFromHost(h.get("host") ?? "");
  if (!slug) return null;
  return db.tenant.findUnique({ where: { slug } });
}

export function portalUrl(slug: string): string {
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${proto}://${slug}.${rootDomain()}`;
}
