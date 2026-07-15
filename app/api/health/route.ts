import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Uptime probe: verifies the app AND its database connection.
// Wire this into your host's health check / external monitoring.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "database unreachable" }, { status: 503 });
  }
}
