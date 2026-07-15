"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Nav link with active styling. `exact` matches only the exact path
 *  (for "/" and "/tech" style index routes); otherwise prefix-matches. */
export function NavLink({
  href,
  exact = false,
  className,
  activeClassName,
  children,
  onNavigate,
}: {
  href: string;
  exact?: boolean;
  className: string;
  activeClassName: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`${className} ${active ? activeClassName : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
