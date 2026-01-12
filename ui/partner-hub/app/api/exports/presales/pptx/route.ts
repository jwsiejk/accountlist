import PptxGenJS from "pptxgenjs";
import { z } from "zod";

import { presalesExportSchema } from "../../../../../lib/exports/presalesExportSchema";

export const runtime = "nodejs";

const fmt2 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const fmt0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

export async function POST(request: Request) {
  try {
    const payload = presalesExportSchema.parse(await request.json());
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";

    const slide = pptx.addSlide();
    slide.addText("Energy & Sustainability Comparison", {
      x: 0.5,
      y: 0.3,
      w: 12.5,
      h: 0.6,
      fontSize: 28,
      bold: true,
    });
    slide.addText(payload.selection.selectedNetAppConfig?.summary ?? "NetApp config not selected", {
      x: 0.5,
      y: 0.95,
      w: 12.5,
      h: 0.4,
      fontSize: 14,
      color: "555555",
    });

    const keyRows = payload.rows.filter((row) => {
      if (payload.meta.viewMode === "energy") {
        return ["effectiveTb", "kwhPerYear", "annualCost", "rackUnits"].includes(row.key);
      }
      if (payload.meta.viewMode === "sustainability") {
        return ["effectiveTb", "co2eYear", "co2ePerTbYear"].includes(row.key);
      }
      return ["effectiveTb", "kwhPerYear", "annualCost", "rackUnits", "co2eYear", "co2ePerTbYear"].includes(row.key);
    });

    const columnText = (valueKey: "flashblade" | "netapp" | "delta") =>
      keyRows.map((row) => `${row.label}: ${row[valueKey]}`).join("\n");

    const columnY = 1.6;
    const columnH = 4.4;
    const columnW = 3.8;
    slide.addText("FlashBlade", { x: 0.5, y: columnY, w: columnW, h: 0.3, fontSize: 16, bold: true });
    slide.addText(columnText("flashblade"), {
      x: 0.5,
      y: columnY + 0.35,
      w: columnW,
      h: columnH,
      fontSize: 12,
      color: "333333",
    });
    slide.addText("NetApp", { x: 4.35, y: columnY, w: columnW, h: 0.3, fontSize: 16, bold: true });
    slide.addText(columnText("netapp"), {
      x: 4.35,
      y: columnY + 0.35,
      w: columnW,
      h: columnH,
      fontSize: 12,
      color: "333333",
    });
    slide.addText("Delta", { x: 8.2, y: columnY, w: columnW, h: 0.3, fontSize: 16, bold: true });
    slide.addText(columnText("delta"), {
      x: 8.2,
      y: columnY + 0.35,
      w: columnW,
      h: columnH,
      fontSize: 12,
      color: "333333",
    });

    const assumptions = [
      `FB Utilization ${fmt2.format(payload.assumptions.flashblade.utilizationPct)}%`,
      `FB PUE ${fmt2.format(payload.assumptions.flashblade.pue)}`,
      `FB $/kWh $${fmt2.format(payload.assumptions.flashblade.pricePerKwh)}`,
      `FB DRR ${fmt2.format(payload.assumptions.flashblade.drr)}`,
      `DFM ${fmt0.format(payload.assumptions.flashblade.dfmSizeTb)} TB`,
      `Capacity ${fmt2.format(payload.assumptions.flashblade.capacityPb)} PB`,
      `NA Utilization ${fmt2.format(payload.assumptions.netapp.utilizationPct)}%`,
      `NA PUE ${fmt2.format(payload.assumptions.netapp.pue)}`,
      `NA $/kWh $${fmt2.format(payload.assumptions.netapp.pricePerKwh)}`,
      `NA Overhead ${fmt2.format(payload.assumptions.netapp.overheadRawToUsable)}`,
      `NA DRR ${fmt2.format(payload.assumptions.netapp.drr)}`,
      `NA Drive ${fmt0.format(payload.assumptions.netapp.driveSizeTb)} TB`,
      `Grid ${fmt2.format(payload.assumptions.sustainability.gridKgCo2ePerKwh)} kgCO₂e/kWh`,
    ];
    slide.addText(`Assumptions: ${assumptions.join(" · ")}`, {
      x: 0.5,
      y: 6.15,
      w: 12.5,
      h: 0.5,
      fontSize: 9,
      color: "666666",
    });

    const sources = payload.sources.length
      ? payload.sources.map((source) => (source.missing ? `MISSING: ${source.label}` : source.url ?? source.label))
      : ["No sources available"];
    slide.addNotes(`Sources:\n${sources.join("\n")}`);

    const buffer = await pptx.write("nodebuffer");
    const filename = `energy-presales-${payload.meta.generatedAt.slice(0, 10)}.pptx`;
    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid payload", issues: err.issues }, { status: 400 });
    }
    return Response.json({ error: "Failed to generate PPTX export" }, { status: 500 });
  }
}
