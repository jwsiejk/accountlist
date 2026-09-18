import { NextResponse } from "next/server";
import Papa from "papaparse";

import { upsertProspects, type ImportedProspect } from "@/lib/sc26-outreach/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Accepts a CSV upload of prospects. Expected headers (case-insensitive,
 * order doesn't matter): email, first_name (or "first name"/"firstname"),
 * last_name, company, title. Only email + first_name are required.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "Missing file upload." }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_]+/g, "_"),
  });

  if (parsed.errors.length) {
    return NextResponse.json(
      { ok: false, error: `CSV parse error: ${parsed.errors[0].message}` },
      { status: 400 }
    );
  }

  const rows: ImportedProspect[] = parsed.data.map((r) => ({
    email: String(r.email ?? "").trim(),
    firstName: String(r.first_name ?? r.firstname ?? "").trim(),
    lastName: String(r.last_name ?? r.lastname ?? "").trim() || undefined,
    company: String(r.company ?? r.account ?? "").trim() || undefined,
    title: String(r.title ?? "").trim() || undefined,
  }));

  const result = await upsertProspects(rows);

  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
