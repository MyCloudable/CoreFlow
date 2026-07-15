import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { brandForeground } from "@/lib/color";

// Every page under a tenant host renders inside this layout. It resolves the
// tenant from the rewritten URL segment and scopes the brand color via a CSS
// variable that all components reference.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<Metadata> {
  const { tenant: slug } = await params;
  const tenant = await db.tenant.findUnique({ where: { slug } });
  return { title: tenant ? `${tenant.name} — Client Portal` : "Portal" };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant) notFound();

  // Suspension is enforced per-role in the (app) and tech layouts (owners keep
  // access so they can fix billing) — the login page must stay reachable here.
  return (
    <div
      style={
        {
          "--brand": tenant.brandColor,
          "--brand-fg": brandForeground(tenant.brandColor),
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
