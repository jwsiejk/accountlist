import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";

import { presalesExportSchema } from "../../../../../lib/exports/presalesExportSchema";

export const runtime = "nodejs";

const fmt0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

const wrapText = (text: string, maxWidth: number, font: any, size: number) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

export async function POST(request: Request) {
  try {
    const payload = presalesExportSchema.parse(await request.json());
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const margin = 40;
    let y = height - margin;

    const drawLine = (text: string, size = 12, bold = false, x = margin) => {
      page.drawText(text, {
        x,
        y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0, 0, 0),
      });
      y -= size + 6;
    };

    drawLine("Energy & Sustainability Comparison", 18, true);
    drawLine(payload.selection.selectedNetAppConfig?.summary ?? "NetApp config not selected", 11);
    y -= 4;

    const keyRows = payload.rows.filter((row) => {
      if (payload.meta.viewMode === "energy") {
        return ["effectiveTb", "kwhPerYear", "annualCost", "rackUnits"].includes(row.key);
      }
      if (payload.meta.viewMode === "sustainability") {
        return ["effectiveTb", "co2eYear", "co2ePerTbYear"].includes(row.key);
      }
      return ["effectiveTb", "kwhPerYear", "annualCost", "rackUnits", "co2eYear", "co2ePerTbYear"].includes(row.key);
    });

    const tableWidth = width - margin * 2;
    const labelWidth = 190;
    const colWidth = (tableWidth - labelWidth) / 3;
    const labelX = margin;
    const fbX = labelX + labelWidth;
    const naX = fbX + colWidth;
    const deltaX = naX + colWidth;

    drawLine("Key totals", 12, true);
    page.drawText("Metric", { x: labelX, y, size: 10, font: fontBold });
    page.drawText("FlashBlade", { x: fbX, y, size: 10, font: fontBold });
    page.drawText("NetApp", { x: naX, y, size: 10, font: fontBold });
    page.drawText("Delta", { x: deltaX, y, size: 10, font: fontBold });
    y -= 16;

    keyRows.forEach((row) => {
      page.drawText(row.label, { x: labelX, y, size: 9, font });
      page.drawText(row.flashblade, { x: fbX, y, size: 9, font });
      page.drawText(row.netapp, { x: naX, y, size: 9, font });
      page.drawText(row.delta, { x: deltaX, y, size: 9, font });
      y -= 14;
    });

    y -= 6;
    drawLine("Assumptions", 11, true);
    const assumptions = [
      `FlashBlade Utilization: ${fmt2.format(payload.assumptions.flashblade.utilizationPct)}%`,
      `FlashBlade PUE: ${fmt2.format(payload.assumptions.flashblade.pue)}`,
      `FlashBlade $/kWh: $${fmt2.format(payload.assumptions.flashblade.pricePerKwh)}`,
      `FlashBlade DRR: ${fmt2.format(payload.assumptions.flashblade.drr)}`,
      `DFM size: ${fmt0.format(payload.assumptions.flashblade.dfmSizeTb)} TB`,
      `Capacity target: ${fmt2.format(payload.assumptions.flashblade.capacityPb)} PB`,
      `NetApp Utilization: ${fmt2.format(payload.assumptions.netapp.utilizationPct)}%`,
      `NetApp PUE: ${fmt2.format(payload.assumptions.netapp.pue)}`,
      `NetApp $/kWh: $${fmt2.format(payload.assumptions.netapp.pricePerKwh)}`,
      `NetApp overhead: ${fmt2.format(payload.assumptions.netapp.overheadRawToUsable)}`,
      `NetApp DRR: ${fmt2.format(payload.assumptions.netapp.drr)}`,
      `NetApp drive size: ${fmt0.format(payload.assumptions.netapp.driveSizeTb)} TB`,
      `Grid factor: ${fmt2.format(payload.assumptions.sustainability.gridKgCo2ePerKwh)} kgCO₂e/kWh (${payload.assumptions.sustainability.gridFactorSource})`,
    ];
    assumptions.forEach((item) => {
      page.drawText(item, { x: margin, y, size: 8, font });
      y -= 12;
    });

    y -= 4;
    drawLine("Sources", 11, true);
    const sourceLines = payload.sources.length
      ? payload.sources.map((source) => (source.missing ? `MISSING: ${source.label}` : source.url ?? source.label))
      : ["No sources available"];
    sourceLines.forEach((line) => {
      const lines = wrapText(line, width - margin * 2, font, 8);
      lines.forEach((wrapped) => {
        if (y < margin + 20) return;
        page.drawText(wrapped, { x: margin, y, size: 8, font });
        y -= 10;
      });
    });

    const pdfBytes = await pdfDoc.save();
    const filename = `energy-presales-${payload.meta.generatedAt.slice(0, 10)}.pdf`;
    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    return Response.json({ error: "Failed to generate PDF export" }, { status: 500 });
  }
}
