import { z } from "zod";

export const presalesExportRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  flashblade: z.string(),
  netapp: z.string(),
  delta: z.string(),
  units: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const presalesExportSchema = z.object({
  meta: z.object({
    toolName: z.string(),
    generatedAt: z.string(),
    viewMode: z.enum(["energy", "sustainability", "both"]),
    dataset: z
      .object({
        lastSyncedISO: z.string().nullable().optional(),
        sourceFiles: z.array(z.string()).nullable().optional(),
        copiedFiles: z.array(z.string()).nullable().optional(),
        sha256: z.record(z.string()).nullable().optional(),
        reportFiles: z.array(z.string()).nullable().optional(),
      })
      .nullable()
      .optional(),
  }),
  assumptions: z.object({
    flashblade: z.object({
      utilizationPct: z.number(),
      pue: z.number(),
      pricePerKwh: z.number(),
      drr: z.number(),
      dfmSizeTb: z.number(),
      capacityPb: z.number(),
    }),
    netapp: z.object({
      utilizationPct: z.number(),
      pue: z.number(),
      pricePerKwh: z.number(),
      overheadRawToUsable: z.number(),
      drr: z.number(),
      driveSizeTb: z.number(),
      driveSizeSelection: z.string(),
    }),
    sustainability: z.object({
      gridKgCo2ePerKwh: z.number(),
      gridFactorSource: z.string(),
    }),
  }),
  selection: z.object({
    mode: z.enum(["auto", "manual"]),
    selectedNetAppConfig: z
      .object({
        controllerModel: z.string(),
        expansionModel: z.string(),
        expansionQty: z.number(),
        driveSizeTb: z.number(),
        rackUnits: z.number().nullable(),
        effectiveTb: z.number(),
        kwhPerYear: z.number(),
        annualCost: z.number(),
        summary: z.string(),
      })
      .nullable(),
    matchInfo: z
      .object({
        tolerancePct: z.number(),
        candidateCount: z.number(),
        selectedIndex: z.number(),
      })
      .nullable()
      .optional(),
  }),
  results: z
    .object({
      flashbladeTotals: z.object({
        effectiveTb: z.number().nullable(),
        weightedW: z.number().nullable(),
        kwhPerYear: z.number().nullable(),
        annualCost: z.number().nullable(),
        btuPerHour: z.number().nullable(),
        rackUnits: z.number().nullable(),
        co2eKgPerYear: z.number().nullable(),
        co2ePerTbYear: z.number().nullable(),
      }),
      netappTotals: z
        .object({
          effectiveTb: z.number().nullable(),
          weightedW: z.number().nullable(),
          kwhPerYear: z.number().nullable(),
          annualCost: z.number().nullable(),
          btuPerHour: z.number().nullable(),
          rackUnits: z.number().nullable(),
          co2eKgPerYear: z.number().nullable(),
          co2ePerTbYear: z.number().nullable(),
        })
        .nullable(),
      deltaTotals: z.object({
        effectiveTb: z.number().nullable(),
        weightedW: z.number().nullable(),
        kwhPerYear: z.number().nullable(),
        annualCost: z.number().nullable(),
        btuPerHour: z.number().nullable(),
        rackUnits: z.number().nullable(),
        co2eKgPerYear: z.number().nullable(),
        co2ePerTbYear: z.number().nullable(),
      }),
    })
    .nullable(),
  rows: z.array(presalesExportRowSchema),
  sources: z.array(
    z.object({
      label: z.string(),
      url: z.string().nullable().optional(),
      missing: z.boolean(),
    }),
  ),
});

export type PresalesExportPayload = z.infer<typeof presalesExportSchema>;
