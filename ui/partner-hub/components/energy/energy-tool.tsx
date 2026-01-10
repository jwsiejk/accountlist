"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  enumerateNetApp,
  fbPower,
  getTracks,
  buildNetAppCandidate,
  loadCsv,
  loadNetApp,
  loadPure,
  validCaps,
  type FbPowerResult,
  type NetAppCandidate,
  type NetAppRow,
  type PureRow,
} from "@/lib/energy/energy-calc";
import {
  getControllerModels,
  getDriveSizes,
  getExpansionModels,
  getMaxExpansionQty,
  loadNetAppDriveCompat,
  type NetAppDriveCompat,
} from "@/lib/energy/netapp-drive-compat";

const fmt0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const fmt2 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

type EnergyMeta = {
  lastSyncedISO?: string;
  sourceFiles?: string[];
  copiedFiles?: string[];
  sha256?: Record<string, string>;
  reportFiles?: string[];
};

type Inputs = {
  dfmTb: number;
  capacityPb: number;
  pureUtilPct: number;
  purePue: number;
  purePrice: number;
  pureDrr: number;
  naUtilPct: number;
  naPue: number;
  naPrice: number;
  naOverhead: number;
  naDrr: number;
  naDriveSizeTb: number;
  tolPct: number;
};

type NetAppMode = "auto" | "manual";

type ManualInputs = {
  controllerModel: string;
  expansionModel: string;
  expansionQty: number;
};

type VendorReportEntry = {
  url: string;
  status?: number;
  finalUrl?: string;
  etag?: string | null;
  lastModified?: string | null;
  contentHash?: string | null;
  error?: string;
  previous?: {
    status?: number;
    finalUrl?: string;
    etag?: string | null;
    lastModified?: string | null;
    contentHash?: string | null;
  };
};

type VendorUpdateReport = {
  checkedAtISO: string;
  ok: VendorReportEntry[];
  redirected: VendorReportEntry[];
  changed: VendorReportEntry[];
  missing: VendorReportEntry[];
  error: VendorReportEntry[];
};

const defaults: Omit<Inputs, "dfmTb" | "capacityPb"> = {
  pureUtilPct: 50,
  purePue: 1.35,
  purePrice: 0.12,
  pureDrr: 2.0,
  naUtilPct: 50,
  naPue: 1.35,
  naPrice: 0.12,
  naOverhead: 0.2,
  naDrr: 1.3,
  naDriveSizeTb: 18,
  tolPct: 10,
};

export function EnergyTool() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [pureRows, setPureRows] = useState<PureRow[]>([]);
  const [netappRows, setNetappRows] = useState<NetAppRow[]>([]);
  const [netappCompat, setNetappCompat] = useState<NetAppDriveCompat | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [compatError, setCompatError] = useState<string | null>(null);
  const [energyMeta, setEnergyMeta] = useState<EnergyMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [vendorReport, setVendorReport] = useState<VendorUpdateReport | null>(null);
  const [vendorReportError, setVendorReportError] = useState<string | null>(null);
  const [sourceCheckHint, setSourceCheckHint] = useState<string | null>(null);

  const [inputs, setInputs] = useState<Inputs>(() => ({
    dfmTb: 48,
    capacityPb: 4,
    ...defaults,
  }));
  const [mode, setMode] = useState<NetAppMode>("auto");
  const [manualInputs, setManualInputs] = useState<ManualInputs>({
    controllerModel: "",
    expansionModel: "",
    expansionQty: 0,
  });

  const [fb, setFb] = useState<FbPowerResult | null>(null);
  const [candidates, setCandidates] = useState<NetAppCandidate[]>([]);
  const [selected, setSelected] = useState<NetAppCandidate | null>(null);
  const [manualCandidate, setManualCandidate] = useState<NetAppCandidate | null>(null);
  const [computeError, setComputeError] = useState<string | null>(null);

  const candidateKey = (candidate: NetAppCandidate) => {
    const effTb = Math.round(candidate.effectiveTb);
    const annualCostCents = Math.round(candidate.annualEnergyCost * 100);
    return [
      candidate.controllerModel,
      candidate.expansionModel,
      candidate.controllerQty,
      candidate.expansionQty,
      effTb,
      annualCostCents,
    ].join("-");
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const [pureCsv, netappCsv] = await Promise.all([
          loadCsv(`${basePath}/data/energy/pure_flashblade_e.csv`),
          loadCsv(`${basePath}/data/energy/netapp_e_series.csv`),
        ]);
        if (cancelled) return;
        const pure = loadPure(pureCsv);
        const netapp = loadNetApp(netappCsv);
        setPureRows(pure);
        setNetappRows(netapp);

        const tracks = getTracks(pure);
        const dfmTb = tracks[0] ?? 48;
        const caps = validCaps(pure, dfmTb, 20);
        setInputs((prev) => ({
          ...prev,
          dfmTb,
          capacityPb: caps[0] ?? prev.capacityPb,
        }));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load energy datasets");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [basePath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCompatError(null);
        const compat = await loadNetAppDriveCompat(basePath);
        if (!cancelled) {
          setNetappCompat(compat);
        }
      } catch (err) {
        if (!cancelled) {
          setCompatError(err instanceof Error ? err.message : "Failed to load NetApp compatibility data");
          setNetappCompat(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [basePath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setVendorReportError(null);
        const res = await fetch(`${basePath}/data/energy/vendor_update_report.json`);
        if (res.status === 404) {
          if (!cancelled) setVendorReport(null);
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to load vendor update report (${res.status})`);
        }
        const data = (await res.json()) as VendorUpdateReport;
        if (!cancelled) {
          setVendorReport(data);
        }
      } catch (err) {
        if (!cancelled) {
          setVendorReportError(err instanceof Error ? err.message : "Failed to load vendor update report");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [basePath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMetaError(null);
        const res = await fetch(`${basePath}/data/energy/energy_data_meta.json`);
        if (!res.ok) {
          throw new Error(`Failed to load energy metadata (${res.status})`);
        }
        const data = (await res.json()) as EnergyMeta;
        if (!cancelled) {
          setEnergyMeta(data);
        }
      } catch (err) {
        if (!cancelled) {
          setMetaError(err instanceof Error ? err.message : "Failed to load energy metadata");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [basePath]);

  const tracks = useMemo(() => getTracks(pureRows), [pureRows]);
  const capacities = useMemo(() => validCaps(pureRows, inputs.dfmTb, 20), [pureRows, inputs.dfmTb]);
  const controllerModels = useMemo(() => getControllerModels(netappCompat), [netappCompat]);
  const expansionModels = useMemo(
    () => getExpansionModels(netappCompat, manualInputs.controllerModel),
    [netappCompat, manualInputs.controllerModel],
  );
  const driveSizes = useMemo(
    () => getDriveSizes(netappCompat, manualInputs.controllerModel, manualInputs.expansionModel),
    [netappCompat, manualInputs.controllerModel, manualInputs.expansionModel],
  );
  const maxExpansionQty = useMemo(
    () => getMaxExpansionQty(netappCompat, manualInputs.controllerModel, manualInputs.expansionModel),
    [netappCompat, manualInputs.controllerModel, manualInputs.expansionModel],
  );
  const allDriveSizes = useMemo(() => {
    if (!netappCompat) return [];
    const sizes = new Set<number>();
    for (const controller of netappCompat.controllers) {
      for (const shelf of controller.expansionShelves) {
        for (const size of shelf.supportedDriveSizesTB) {
          sizes.add(size);
        }
      }
    }
    return Array.from(sizes).sort((a, b) => a - b);
  }, [netappCompat]);
  const driveSizeOptions = mode === "manual" ? driveSizes : allDriveSizes;
  const manualDriveSizeMissing =
    mode === "manual" &&
    manualInputs.controllerModel.length > 0 &&
    manualInputs.expansionModel.length > 0 &&
    driveSizes.length === 0;
  const manualApplyDisabled =
    loading ||
    manualInputs.controllerModel.length === 0 ||
    manualInputs.expansionModel.length === 0 ||
    manualDriveSizeMissing ||
    netappRows.length === 0;

  const runModel = () => {
    try {
      setComputeError(null);
      const fbResult = fbPower(
        pureRows,
        inputs.dfmTb,
        inputs.capacityPb,
        inputs.pureUtilPct / 100,
        inputs.purePue,
        inputs.purePrice,
        inputs.pureDrr,
      );
      const tolFrac = inputs.tolPct / 100;
      const netapp = enumerateNetApp(
        netappRows,
        fbResult.effectiveTb,
        inputs.naUtilPct / 100,
        inputs.naPue,
        inputs.naPrice,
        inputs.naOverhead,
        inputs.naDrr,
        inputs.naDriveSizeTb,
        tolFrac,
      );
      setFb(fbResult);
      setCandidates(netapp);
      setSelected((prev) => {
        if (netapp.length === 0) return null;
        if (prev) {
          const match = netapp.find((candidate) => candidateKey(candidate) === candidateKey(prev));
          if (match) return match;
        }
        return netapp[0];
      });
    } catch (err) {
      setComputeError(err instanceof Error ? err.message : "Failed to compute results");
      setFb(null);
      setCandidates([]);
      setSelected(null);
    }
  };

  const runManual = () => {
    if (!manualInputs.controllerModel || !manualInputs.expansionModel) return;
    try {
      setComputeError(null);
      const candidate = buildNetAppCandidate(
        netappRows,
        manualInputs.controllerModel,
        manualInputs.expansionModel,
        manualInputs.expansionQty,
        inputs.naUtilPct / 100,
        inputs.naPue,
        inputs.naPrice,
        inputs.naOverhead,
        inputs.naDrr,
        inputs.naDriveSizeTb,
      );
      setManualCandidate(candidate);
    } catch (err) {
      setComputeError(err instanceof Error ? err.message : "Failed to compute manual NetApp config");
      setManualCandidate(null);
    }
  };

  useEffect(() => {
    if (pureRows.length > 0 && netappRows.length > 0) {
      runModel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pureRows.length, netappRows.length]);

  useEffect(() => {
    if (controllerModels.length === 0) return;
    const controllerModel = manualInputs.controllerModel || controllerModels[0];
    const controllerExpansionModels = getExpansionModels(netappCompat, controllerModel);
    const expansionModel = manualInputs.expansionModel || controllerExpansionModels[0] || "";
    const sizes = getDriveSizes(netappCompat, controllerModel, expansionModel);
    const nextMax = getMaxExpansionQty(netappCompat, controllerModel, expansionModel);
    setManualInputs((prev) => ({
      ...prev,
      controllerModel,
      expansionModel,
      expansionQty: nextMax != null ? Math.min(prev.expansionQty, nextMax) : prev.expansionQty,
    }));
    if (sizes.length > 0 && !sizes.includes(inputs.naDriveSizeTb)) {
      setInputs((prev) => ({ ...prev, naDriveSizeTb: sizes[0] }));
    }
  }, [
    controllerModels,
    inputs.naDriveSizeTb,
    manualInputs.controllerModel,
    manualInputs.expansionModel,
    netappCompat,
  ]);

  useEffect(() => {
    if (
      mode === "manual" &&
      manualInputs.controllerModel &&
      manualInputs.expansionModel &&
      !manualDriveSizeMissing &&
      netappRows.length > 0
    ) {
      runManual();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    manualInputs.controllerModel,
    manualInputs.expansionModel,
    manualInputs.expansionQty,
    manualDriveSizeMissing,
    inputs.naUtilPct,
    inputs.naPue,
    inputs.naPrice,
    inputs.naOverhead,
    inputs.naDrr,
    inputs.naDriveSizeTb,
    netappRows.length,
  ]);

  useEffect(() => {
    if (driveSizeOptions.length === 0) return;
    if (!driveSizeOptions.includes(inputs.naDriveSizeTb)) {
      setInputs((prev) => ({ ...prev, naDriveSizeTb: driveSizeOptions[0] }));
    }
  }, [driveSizeOptions, inputs.naDriveSizeTb]);

  const band = useMemo(() => {
    if (!fb) return null;
    const tolFrac = inputs.tolPct / 100;
    return {
      low: fb.effectiveTb * (1 - tolFrac),
      high: fb.effectiveTb * (1 + tolFrac),
    };
  }, [fb, inputs.tolPct]);

  const selectedCandidate = mode === "manual" ? manualCandidate : selected;
  const sourceEntries = useMemo(() => {
    const entries: Array<{ model: string; url?: string }> = [];
    if (pureRows.length > 0) {
      const dfm = inputs.dfmTb;
      const lookup = (needle: string) =>
        pureRows.find(
          (row) => row.DFM_Size_TB === dfm && String(row.Model ?? "").toLowerCase().includes(needle),
        );
      const ecRow = lookup("ec chassis");
      const exRow = lookup("ex chassis");
      const xfmRow = lookup("xfm");
      [ecRow, exRow, xfmRow].forEach((row) => {
        if (!row) return;
        entries.push({
          model: String(row.Model ?? "Unknown model"),
          url: row.Source_URL ? String(row.Source_URL) : undefined,
        });
      });
    }

    if (selectedCandidate) {
      const controllerRow = netappRows.find(
        (row) =>
          row.Component_Type === "Controller_Shelf" &&
          String(row.Model ?? "") === selectedCandidate.controllerModel,
      );
      if (controllerRow) {
        entries.push({
          model: String(controllerRow.Model ?? selectedCandidate.controllerModel),
          url: controllerRow.Source_URL ? String(controllerRow.Source_URL) : undefined,
        });
      }
      const expansionRow = netappRows.find(
        (row) =>
          row.Component_Type === "Expansion_Shelf" &&
          String(row.Model ?? "") === selectedCandidate.expansionModel,
      );
      if (expansionRow) {
        entries.push({
          model: String(expansionRow.Model ?? selectedCandidate.expansionModel),
          url: expansionRow.Source_URL ? String(expansionRow.Source_URL) : undefined,
        });
      }
    }

    return entries;
  }, [inputs.dfmTb, netappRows, pureRows, selectedCandidate]);

  const sourceList = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ type: "link" | "missing"; label: string; url?: string }> = [];
    for (const entry of sourceEntries) {
      if (entry.url) {
        if (seen.has(entry.url)) continue;
        seen.add(entry.url);
        items.push({ type: "link", label: entry.url, url: entry.url });
      } else {
        items.push({ type: "missing", label: `Source missing for ${entry.model}` });
      }
    }
    return items;
  }, [sourceEntries]);

  const savings = useMemo(() => {
    if (!fb || !selectedCandidate) return null;
    const deltaW = fb.weightedW - selectedCandidate.weightedW;
    const deltaKwh = fb.kwhWithPue - selectedCandidate.kwhYearWithPue;
    const deltaCost = fb.annualCost - selectedCandidate.annualEnergyCost;
    const deltaRackUnits = fb.rackUnits - selectedCandidate.rackUnits;
    return {
      deltaW,
      deltaKwh,
      deltaCost,
      deltaRackUnits,
      pctCost: fb.annualCost > 0 ? (deltaCost / fb.annualCost) * 100 : null,
    };
  }, [fb, selectedCandidate]);

  const handleDownloadAssumptions = () => {
    const payload = {
      lastSyncedISO: energyMeta?.lastSyncedISO ?? null,
      mode,
      assumptions: {
        flashblade: {
          utilizationPct: inputs.pureUtilPct,
          pue: inputs.purePue,
          pricePerKwh: inputs.purePrice,
          drr: inputs.pureDrr,
          dfmSizeTb: inputs.dfmTb,
          capacityPb: inputs.capacityPb,
        },
        netapp: {
          utilizationPct: inputs.naUtilPct,
          pue: inputs.naPue,
          pricePerKwh: inputs.naPrice,
          overheadRawToUsable: inputs.naOverhead,
          drr: inputs.naDrr,
          driveSizeTb: inputs.naDriveSizeTb,
          driveSizeSelection:
            mode === "manual" ? "Compatibility dataset (controller + shelf pairing)" : "Compatibility dataset (all drives)",
        },
      },
      selectedNetApp: selectedCandidate
        ? {
            controllerModel: selectedCandidate.controllerModel,
            expansionModel: selectedCandidate.expansionModel,
            expansionShelves: selectedCandidate.expansionQty,
            driveSizeTb: inputs.naDriveSizeTb,
          }
        : null,
      sources: sourceList.map((item) => (item.type === "link" ? item.url : item.label)),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "assumptions.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCheckSources = async () => {
    const command = "node ui/partner-hub/scripts/check-vendor-sources.mjs";
    try {
      await navigator.clipboard.writeText(command);
      setSourceCheckHint(`Run locally: ${command} (command copied)`);
    } catch {
      setSourceCheckHint(`Run locally: ${command}`);
    }
  };

  const reportSections: Array<[string, VendorReportEntry[]]> = vendorReport
    ? [
        ["Changed", vendorReport.changed],
        ["Redirected", vendorReport.redirected],
        ["Missing", vendorReport.missing],
        ["Errors", vendorReport.error],
        ["OK", vendorReport.ok],
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Energy Tool</h1>
        <p className="text-sm text-foreground/70">
          Compare annual energy consumption and cost between a FlashBlade//E configuration and a NetApp E-Series baseline.
        </p>
      </header>

      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dataset load failed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/70">{loadError}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">FlashBlade//E inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  DFM size (TB)
                </label>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={inputs.dfmTb}
                  onChange={(e) => {
                    const dfmTb = Number(e.target.value);
                    const caps = validCaps(pureRows, dfmTb, 20);
                    setInputs((prev) => ({
                      ...prev,
                      dfmTb,
                      capacityPb: caps[0] ?? prev.capacityPb,
                    }));
                  }}
                  disabled={loading || tracks.length === 0}
                >
                  {tracks.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  Capacity (Usable PB)
                </label>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={inputs.capacityPb}
                  onChange={(e) => setInputs((prev) => ({ ...prev, capacityPb: Number(e.target.value) }))}
                  disabled={loading || capacities.length === 0}
                >
                  {capacities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <NumberInput label="Utilization %" value={inputs.pureUtilPct} onChange={(v) => setInputs((p) => ({ ...p, pureUtilPct: v }))} />
              <NumberInput label="PUE" value={inputs.purePue} step={0.01} onChange={(v) => setInputs((p) => ({ ...p, purePue: v }))} />
              <NumberInput label="$ / kWh" value={inputs.purePrice} step={0.001} onChange={(v) => setInputs((p) => ({ ...p, purePrice: v }))} />
              <NumberInput label="DRR" value={inputs.pureDrr} step={0.1} onChange={(v) => setInputs((p) => ({ ...p, pureDrr: v }))} />
            </div>
            <p className="text-xs text-foreground/60">
              Capacity points are constrained to valid DFM track increments.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">NetApp baseline inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex w-full rounded-md border border-border bg-background p-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
              <button
                type="button"
                className={
                  "flex-1 rounded-sm px-3 py-2 transition " +
                  (mode === "auto" ? "bg-muted text-foreground shadow-sm" : "hover:bg-muted/50")
                }
                onClick={() => setMode("auto")}
              >
                Auto match (within tolerance)
              </button>
              <button
                type="button"
                className={
                  "flex-1 rounded-sm px-3 py-2 transition " +
                  (mode === "manual" ? "bg-muted text-foreground shadow-sm" : "hover:bg-muted/50")
                }
                onClick={() => setMode("manual")}
              >
                Manual config
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <NumberInput label="Utilization %" value={inputs.naUtilPct} onChange={(v) => setInputs((p) => ({ ...p, naUtilPct: v }))} />
              <NumberInput label="PUE" value={inputs.naPue} step={0.01} onChange={(v) => setInputs((p) => ({ ...p, naPue: v }))} />
              <NumberInput label="$ / kWh" value={inputs.naPrice} step={0.001} onChange={(v) => setInputs((p) => ({ ...p, naPrice: v }))} />
              <NumberInput label="Overhead (raw→usable)" value={inputs.naOverhead} step={0.01} onChange={(v) => setInputs((p) => ({ ...p, naOverhead: v }))} />
              <NumberInput label="DRR" value={inputs.naDrr} step={0.1} onChange={(v) => setInputs((p) => ({ ...p, naDrr: v }))} />
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  Drive size (TB)
                </label>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={inputs.naDriveSizeTb}
                  onChange={(e) => setInputs((p) => ({ ...p, naDriveSizeTb: Number(e.target.value) }))}
                  disabled={loading || driveSizeOptions.length === 0}
                >
                  {driveSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              {mode === "auto" ? (
                <NumberInput label="Auto-match tolerance (±%)" value={inputs.tolPct} step={0.1} onChange={(v) => setInputs((p) => ({ ...p, tolPct: v }))} />
              ) : null}
            </div>

            {mode === "manual" ? (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  Manual configuration
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                      Controller model
                    </label>
                    <select
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      value={manualInputs.controllerModel}
                      onChange={(e) => {
                        const controllerModel = e.target.value;
                        const nextExpansionModels = getExpansionModels(netappCompat, controllerModel);
                        const expansionModel = nextExpansionModels[0] ?? "";
                        const sizes = getDriveSizes(netappCompat, controllerModel, expansionModel);
                        const nextMax = getMaxExpansionQty(netappCompat, controllerModel, expansionModel);
                        setManualInputs((prev) => ({
                          ...prev,
                          controllerModel,
                          expansionModel,
                          expansionQty: nextMax != null ? Math.min(prev.expansionQty, nextMax) : prev.expansionQty,
                        }));
                        if (sizes.length > 0) {
                          setInputs((prev) => ({ ...prev, naDriveSizeTb: sizes[0] }));
                        }
                      }}
                      disabled={loading || controllerModels.length === 0}
                    >
                      {controllerModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                      Expansion shelf model
                    </label>
                    <select
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      value={manualInputs.expansionModel}
                      onChange={(e) => {
                        const expansionModel = e.target.value;
                        const sizes = getDriveSizes(netappCompat, manualInputs.controllerModel, expansionModel);
                        const nextMax = getMaxExpansionQty(netappCompat, manualInputs.controllerModel, expansionModel);
                        setManualInputs((prev) => ({
                          ...prev,
                          expansionModel,
                          expansionQty: nextMax != null ? Math.min(prev.expansionQty, nextMax) : prev.expansionQty,
                        }));
                        if (sizes.length > 0) {
                          setInputs((prev) => ({ ...prev, naDriveSizeTb: sizes[0] }));
                        }
                      }}
                      disabled={loading || expansionModels.length === 0}
                    >
                      {expansionModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                  <NumberInput
                    label="# of expansion shelves"
                    value={manualInputs.expansionQty}
                    step={1}
                    onChange={(value) =>
                      setManualInputs((prev) => ({
                        ...prev,
                        expansionQty:
                          maxExpansionQty != null ? Math.min(Math.max(0, value), maxExpansionQty) : Math.max(0, value),
                      }))
                    }
                  />
                </div>
                {manualDriveSizeMissing ? (
                  <div className="mt-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    No compatibility data for {manualInputs.controllerModel}/{manualInputs.expansionModel}. Update
                    netapp_drive_compat.json.
                  </div>
                ) : null}
                {compatError ? (
                  <div className="mt-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {compatError}
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-foreground/60">
                  Manual configs use the same power and capacity model as auto-matched candidates.
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {mode === "auto" ? (
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  onClick={runModel}
                  disabled={loading || pureRows.length === 0 || netappRows.length === 0}
                >
                  Recalculate
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  onClick={runManual}
                  disabled={manualApplyDisabled}
                >
                  Apply manual config
                </button>
              )}
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted/50"
                onClick={() => setAssumptionsOpen((prev) => !prev)}
              >
                Assumptions &amp; Sources
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted/50"
                onClick={handleCheckSources}
              >
                Check sources (local)
              </button>
              {loading ? <span className="text-xs text-foreground/60">Loading datasets…</span> : null}
              {computeError ? <span className="text-xs font-semibold text-red-600">{computeError}</span> : null}
              {sourceCheckHint ? <span className="text-xs text-foreground/60">{sourceCheckHint}</span> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {fb ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">FlashBlade//E totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Metric label="Effective TB" value={fmt0.format(fb.effectiveTb)} />
                <Metric label="Weighted IT load (W)" value={fmt0.format(fb.weightedW)} />
                <Metric label="kWh / year (with PUE)" value={fmt0.format(fb.kwhWithPue)} />
                <Metric label="Annual energy cost" value={`$${fmt0.format(fb.annualCost)}`} />
                <Metric label="BTU / hour" value={fmt0.format(fb.btuPerHour)} />
                <Metric label="Rack units" value={fmt0.format(fb.rackUnits)} />
                <div className="pt-2 text-xs text-foreground/60">
                  Composition: {fb.ecQty}×EC, {fb.exQty}×EX, {fb.xfmQty}×XFM
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {mode === "auto" ? "NetApp candidates (within tolerance)" : "NetApp candidates"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mode === "auto" ? (
                  <>
                    {band ? (
                      <p className="mb-3 text-xs text-foreground/60">
                        Target band: {fmt0.format(band.low)}–{fmt0.format(band.high)} effective TB (±{fmt1.format(inputs.tolPct)}%).
                      </p>
                    ) : null}
                    {candidates.length === 0 ? (
                      <p className="text-sm text-foreground/70">
                        No candidates found in the tolerance band. Try widening tolerance or adjusting NetApp overhead / DRR / drive size.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-border text-foreground/60">
                            <tr>
                              <th className="py-2 pr-3 font-semibold">Controller</th>
                              <th className="py-2 pr-3 font-semibold">Exp shelves</th>
                              <th className="py-2 pr-3 font-semibold">RU</th>
                              <th className="py-2 pr-3 font-semibold">Eff TB</th>
                              <th className="py-2 pr-3 font-semibold">Δ vs target</th>
                              <th className="py-2 pr-3 font-semibold">Annual $</th>
                              <th className="py-2 pr-3 font-semibold">W / eff TB</th>
                            </tr>
                          </thead>
                          <tbody>
                            {candidates.slice(0, 8).map((c) => {
                              const isSelected = selected ? candidateKey(selected) === candidateKey(c) : false;
                              return (
                                <tr
                                  key={candidateKey(c)}
                                  className={
                                    "cursor-pointer border-b border-border/60 transition focus-visible:outline-none focus-visible:ring-2 " +
                                    "focus-visible:ring-primary/60 focus-visible:ring-inset " +
                                    (isSelected
                                      ? "bg-muted/60 font-semibold ring-1 ring-primary/30"
                                      : "hover:bg-muted/40")
                                  }
                                  onClick={() => setSelected(c)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      setSelected(c);
                                    }
                                  }}
                                  role="button"
                                  aria-selected={isSelected}
                                  tabIndex={0}
                                >
                                  <td className="py-2 pr-3 font-medium">
                                    <div className="flex items-center gap-2">
                                      <span>{c.controllerModel}</span>
                                      {isSelected ? (
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          Selected
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="py-2 pr-3">{c.expansionQty}</td>
                                  <td className="py-2 pr-3">{fmt0.format(c.rackUnits)}</td>
                                  <td className="py-2 pr-3">{fmt0.format(c.effectiveTb)}</td>
                                  <td className="py-2 pr-3">{fmt2.format(c.pctDiffFromTarget)}%</td>
                                  <td className="py-2 pr-3">${fmt0.format(c.annualEnergyCost)}</td>
                                  <td className="py-2 pr-3">{c.wPerEffectiveTb ? fmt2.format(c.wPerEffectiveTb) : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <p className="mt-2 text-[11px] text-foreground/60">
                          Click a NetApp row to see a side-by-side comparison.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-foreground/70">
                    Manual mode uses the configuration you apply above for the comparison.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Comparison</CardTitle>
              {selectedCandidate ? (
                <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  SELECTED: {selectedCandidate.controllerModel} + {selectedCandidate.expansionQty} shelf
                  {selectedCandidate.expansionQty === 1 ? "" : "es"}
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              {selectedCandidate ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <MiniCompare
                    title="FlashBlade//E"
                    items={[
                      ["Effective TB", fmt0.format(fb.effectiveTb)],
                      ["Weighted IT load (W)", fmt0.format(fb.weightedW)],
                      ["kWh / year (with PUE)", fmt0.format(fb.kwhWithPue)],
                      ["Annual energy cost", `$${fmt0.format(fb.annualCost)}`],
                      ["Rack units", fmt0.format(fb.rackUnits)],
                    ]}
                  />
                  <MiniCompare
                    title="NetApp"
                    items={[
                      ["Effective TB", fmt0.format(selectedCandidate.effectiveTb)],
                      ["Weighted IT load (W)", fmt0.format(selectedCandidate.weightedW)],
                      ["kWh / year (with PUE)", fmt0.format(selectedCandidate.kwhYearWithPue)],
                      ["Annual energy cost", `$${fmt0.format(selectedCandidate.annualEnergyCost)}`],
                      ["Rack units", fmt0.format(selectedCandidate.rackUnits)],
                    ]}
                  />
                  <MiniCompare
                    title="Δ (Pure − NetApp)"
                    items={[
                      ["Δ IT load (W)", fmt0.format(savings?.deltaW ?? 0)],
                      ["Δ kWh / year", fmt0.format(savings?.deltaKwh ?? 0)],
                      ["Δ annual cost", `$${fmt0.format(savings?.deltaCost ?? 0)}`],
                      ["Δ cost %", savings?.pctCost == null ? "—" : `${fmt1.format(savings.pctCost)}%`],
                      ["Δ rack units", fmt0.format(savings?.deltaRackUnits ?? 0)],
                    ]}
                  />
                </div>
              ) : (
                <p className="text-sm text-foreground/70">
                  {mode === "manual"
                    ? "Apply a manual NetApp configuration to see the comparison."
                    : "Select a NetApp candidate to see the comparison."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {assumptionsOpen ? (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Assumptions &amp; Sources</CardTitle>
              <p className="text-xs text-foreground/60">
                Last synced: {energyMeta?.lastSyncedISO ?? (metaError ? "Unavailable" : "Loading…")}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-muted/50"
              onClick={handleDownloadAssumptions}
              disabled={sourceEntries.length === 0 && !energyMeta}
            >
              Download assumptions.json
            </button>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">A) Assumptions</h3>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-md border border-border p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">FlashBlade//E</div>
                  <ul className="mt-2 space-y-1">
                    <li>Utilization: {fmt1.format(inputs.pureUtilPct)}%</li>
                    <li>PUE: {fmt2.format(inputs.purePue)}</li>
                    <li>$ / kWh: ${fmt2.format(inputs.purePrice)}</li>
                    <li>DRR: {fmt2.format(inputs.pureDrr)}</li>
                    <li>DFM size: {fmt0.format(inputs.dfmTb)} TB</li>
                    <li>Capacity target: {fmt2.format(inputs.capacityPb)} PB</li>
                  </ul>
                </div>
                <div className="rounded-md border border-border p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">NetApp baseline</div>
                  <ul className="mt-2 space-y-1">
                    <li>Utilization: {fmt1.format(inputs.naUtilPct)}%</li>
                    <li>PUE: {fmt2.format(inputs.naPue)}</li>
                    <li>$ / kWh: ${fmt2.format(inputs.naPrice)}</li>
                    <li>Overhead (raw→usable): {fmt2.format(inputs.naOverhead)}</li>
                    <li>DRR: {fmt2.format(inputs.naDrr)}</li>
                    <li>
                      Drive size selection: {fmt0.format(inputs.naDriveSizeTb)} TB{" "}
                      {mode === "manual" ? "(compat pairing)" : "(compat list)"}
                    </li>
                    <li>
                      Selected config:{" "}
                      {selectedCandidate
                        ? `${selectedCandidate.controllerModel} + ${selectedCandidate.expansionQty} ${selectedCandidate.expansionQty === 1 ? "shelf" : "shelves"} (${selectedCandidate.expansionModel})`
                        : "No NetApp candidate selected"}
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">B) Formulas</h3>
              <ul className="list-disc space-y-1 pl-5 text-foreground/80">
                <li>Weighted power (W) = Idle + Utilization × (Typical − Idle)</li>
                <li>kWh / year (with PUE) = (Weighted power × 8760 / 1000) × PUE</li>
                <li>Annual energy cost = kWh / year × $ / kWh</li>
                <li>Effective TB = Usable TB × DRR</li>
                <li>BTU / hour = Weighted power (W) × 3.412</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">C) Sources</h3>
              {sourceList.length > 0 ? (
                <ul className="space-y-1">
                  {sourceList.map((item) =>
                    item.type === "link" ? (
                      <li key={item.label}>
                        <a className="text-primary underline-offset-2 hover:underline" href={item.url} target="_blank" rel="noreferrer">
                          {item.label}
                        </a>
                      </li>
                    ) : (
                      <li key={item.label} className="text-foreground/70">
                        {item.label}
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="text-foreground/60">No source links available for the current selection.</p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">D) Source freshness (local)</h3>
              {vendorReport ? (
                <div className="space-y-3 text-xs text-foreground/70">
                  <p>
                    Last checked: {vendorReport.checkedAtISO} ·{" "}
                    {vendorReport.ok.length} ok, {vendorReport.redirected.length} redirected,{" "}
                    {vendorReport.changed.length} changed, {vendorReport.missing.length} missing,{" "}
                    {vendorReport.error.length} error
                  </p>
                  {reportSections.map(([label, entries]) => (
                    <div key={label} className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                        {label}
                      </div>
                      {entries.length > 0 ? (
                        <ul className="space-y-1">
                          {entries.map((entry) => (
                            <li key={`${label}-${entry.url}`}>
                              <a
                                className="text-primary underline-offset-2 hover:underline"
                                href={entry.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {entry.url}
                              </a>
                              {entry.finalUrl && entry.finalUrl !== entry.url ? (
                                <>
                                  <span className="text-foreground/50"> → </span>
                                  <a
                                    className="text-primary underline-offset-2 hover:underline"
                                    href={entry.finalUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {entry.finalUrl}
                                  </a>
                                </>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-foreground/50">None.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : vendorReportError ? (
                <p className="text-foreground/60">{vendorReportError}</p>
              ) : (
                <p className="text-foreground/60">Run the local source check to see freshness status.</p>
              )}
            </section>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function MiniCompare({
  title,
  items,
}: {
  title: string;
  items: Array<[string, string]>;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">{title}</div>
      <div className="space-y-2 text-sm">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <span className="text-foreground/60">{k}</span>
            <span className="font-semibold text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-foreground/60">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-foreground/60">{label}</label>
      <input
        type="number"
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
      />
    </div>
  );
}
