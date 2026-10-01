import { NextResponse } from "next/server";

import { getCampaignOverview } from "@/lib/outreach/overview";
import { buildReportCsv } from "@/lib/outreach/reportCsv";
import { buildReportText } from "@/lib/outreach/reportText";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilenamePart(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "campaign";
}

function validTimeZone(tz: string | null): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/**
 * Campaign report as a downloadable CSV (one row per contact, grouped by
 * batch), or plain text with `format=text`. Optional `batchId` (a batch id or
 * "unassigned") limits it to one batch; `tz` is an IANA time zone (the
 * dashboard passes the browser's) used to format send times.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const campaignId = Number(url.searchParams.get("campaignId"));
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return NextResponse.json({ ok: false, error: "campaignId query param is required." }, { status: 400 });
  }
  const batchParam = url.searchParams.get("batchId");
  const tz = validTimeZone(url.searchParams.get("tz"));

  try {
    const overview = await getCampaignOverview(campaignId);
    if (!overview) return NextResponse.json({ ok: false, error: "Campaign not found." }, { status: 404 });

    let only;
    if (batchParam !== null) {
      const wanted = batchParam === "unassigned" ? null : Number(batchParam);
      only = overview.batches.filter((b) => b.id === wanted);
      if (only.length === 0) return NextResponse.json({ ok: false, error: "Batch not found." }, { status: 404 });
    }

    const csv = buildReportCsv(overview, tz, only);
    const stamp = new Date().toISOString().slice(0, 10);
    const scope = only && only.length === 1 ? `-${safeFilenamePart(only[0].name)}` : "";

    // format=text: the same report as plain text, for pasting into an email
    // or chat message (the dashboard's "Copy summary" button uses this).
    if (url.searchParams.get("format") === "text") {
      return new NextResponse(buildReportText(overview, tz, only), {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFilenamePart(overview.campaign.name)}${scope}-report-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("outreach report failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to build report." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
