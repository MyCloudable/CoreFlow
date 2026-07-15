import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@/lib/constants";

const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, expiresAt } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
    cookieStore.delete(SESSION_COOKIE);
  }
}

/** The logged-in user for this request, or null. Cookie is host-scoped, so
 *  each tenant subdomain (and the root domain) has its own session. */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) {
    return null;
  }
  return session.user;
}

/** Guard for server actions/pages. Throws if not logged in, wrong tenant, or wrong role. */
export async function requireUser(opts: {
  tenantId?: string;
  roles?: Role[];
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (opts.tenantId !== undefined && user.tenantId !== opts.tenantId) {
    throw new Error("Wrong tenant");
  }
  if (opts.roles && !opts.roles.includes(user.role as Role)) {
    throw new Error("Not authorized");
  }
  return user;
}
