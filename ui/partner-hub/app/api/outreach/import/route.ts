import { NextResponse } from "next/server";
import Papa from "papaparse";

import { BatchError, createBatch } from "@/lib/outreach/batches";
import { upsertProspects, type ImportedProspect } from "@/lib/outreach/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Accepts a CSV upload of prospects for one campaign (campaignId form
 * field, required). Expected CSV headers (case-insensitive, order doesn't
 * matter): email, first_name (or "first name"/"firstname"), last_name,
 * company, title. Only email + first_name are required.
 *
 * Which batch the contacts land in is chosen with the `batchId` form field:
 *   - a batch id        -> import into that existing batch
 *   - "new"             -> create a new batch first (named by `newBatchName`,
 *                          or "Batch N" if that's blank) and import into it
 *   - omitted           -> no batch ("Unassigned")
 * A contact whose email is already in the campaign keeps its current batch
 * (unless it had none) -- see upsertProspects.
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

    // Resolve the target batch only after the CSV has parsed, so a bad file
    // doesn't leave an empty batch behind.
    const batchField = String(form?.get("batchId") ?? "").trim();
    let batch: { id: number; name: string } | null = null;
    let batchId: number | null = null;
    if (batchField === "new") {
      const created = await createBatch(campaignId, String(form?.get("newBatchName") ?? ""));
      batch = { id: created.id, name: created.name };
      batchId = created.id;
    } else if (batchField) {
      const parsedId = Number(batchField);
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return NextResponse.json({ ok: false, error: "Invalid batchId." }, { status: 400 });
      }
      batchId = parsedId;
    }

    const result = await upsertProspects(campaignId, rows, batchId);

    return NextResponse.json({ ok: true, ...result, batch }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof BatchError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
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
