import { NextResponse } from "next/server";
import Papa from "papaparse";

import { upsertProspects, type ImportedProspect } from "@/lib/outreach/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Accepts a CSV upload of prospects for one campaign (campaignId form
 * field, required). Expected CSV headers (case-insensitive, order doesn't
 * matter): email, first_name (or "first name"/"firstname"), last_name,
 * company, title. Only email + first_name are required.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    const campaignId = Number(form?.get("campaignId"));

    if (!Number.isInteger(campaignId) || campaignId <= 0) {
      return NextResponse.json({ ok: false, error: "Missing or invalid campaignId." }, { status: 400 });
    }
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

    const result = await upsertProspects(campaignId, rows);

    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Without this, a DB error (e.g. a migration that hasn't run against
    // the deployed database yet) throws here, Next.js returns its default
    // HTML 500 page instead of JSON, and the client's `await res.json()`
    // blows up parsing that HTML -- which is exactly what made import look
    // like it was silently doing nothing, the first time this bit us.
    console.error("outreach import failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Import failed unexpectedly." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
