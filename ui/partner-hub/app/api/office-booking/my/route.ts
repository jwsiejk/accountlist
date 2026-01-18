import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  const e = String(email || "").trim();
  if (!e) return false;
  if (!e.includes("@")) return false;
  if (e.startsWith("@") || e.endsWith("@")) return false;
  return true;
}

/**
 * GET /api/office-booking/my?email=you@company.com
 * Returns bookings tied to that email (no auth yet).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") || "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const bookings = await prisma.booking.findMany({
    where: { email },
    orderBy: { start: "asc" },
    select: {
      id: true,
      officeId: true,
      start: true,
      end: true,
      name: true,
      email: true,
    },
    take: 100,
  });

  return NextResponse.json(
    {
      bookings: bookings.map((b) => ({
        id: b.id,
        officeId: b.officeId,
        start: b.start.toISOString(),
        end: b.end.toISOString(),
        name: b.name,
        email: b.email,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
