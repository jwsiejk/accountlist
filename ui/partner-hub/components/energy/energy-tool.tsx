"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  enumerateVast,
  enumerateNetApp,
  fbPower,
  getTracks,
  buildNetAppCandidate,
  loadCsv,
  loadNetApp,
  loadPure,
  loadVast,
  validCaps,
  type FbPowerResult,
  type NetAppCandidate,
  type NetAppRow,
  type PureRow,
  type VastRow,
} from "@/lib/energy/energy-calc";
import {
  getControllerModels,
  getDriveSizes,
  getExpansionModels,
  getMaxExpansionQty,
  loadNetAppDriveCompat,
  type NetAppDriveCompat,
} from "@/lib/energy/netapp-drive-compat";
import { BASE_PATH, withBasePath } from "@/lib/basePath";

const fmt0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const fmt2 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const formatRackUnits = (value: number | null | undefined) => (value == null ? "—" : fmt0.format(value));
const DEFAULT_GRID_KGCO2E_PER_KWH = 0.4;
const VAST_DRIVE_SIZES_TB = [16, 18, 20, 22];
const INPUT_BASE_CLASSES =
  "h-10 w-full rounded-lg border border-border/70 bg-card px-3 text-sm text-foreground shadow-sm transition placeholder:text-foreground/40 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const LABEL_CLASSES = "text-xs font-semibold uppercase tracking-wide text-foreground/60";

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
type ViewMode = "energy" | "sustainability" | "both";
type CompetitorVendor = "NetApp" | "Vast";

type RowKey =
  | "effectiveTb"
  | "weightedW"
  | "kwhPerYear"
  | "annualCost"
  | "costPct"
  | "btuPerHour"
  | "rackUnits"
  | "co2eYear"
  | "co2ePerTbYear";

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

const energyRowKeys = [
  "effectiveTb",
  "weightedW",
  "kwhPerYear",
  "annualCost",
  "costPct",
  "rackUnits",
] as const satisfies readonly RowKey[];
const energyTotalsRowKeys = [
  "effectiveTb",
  "weightedW",
  "kwhPerYear",
  "annualCost",
  "costPct",
  "btuPerHour",
  "rackUnits",
] as const satisfies readonly RowKey[];
const sustainabilityRowKeys = ["effectiveTb", "co2eYear", "co2ePerTbYear"] as const satisfies readonly RowKey[];
const energyRowKeySet = new Set<RowKey>(energyRowKeys);
const combinedRowKeys = (primary: readonly RowKey[], secondary: readonly RowKey[]) => {
  const seen = new Set<RowKey>();
  const list: RowKey[] = [];
  for (const key of primary) {
    if (!seen.has(key)) {
      seen.add(key);
      list.push(key);
    }
  }
  for (const key of secondary) {
    if (!seen.has(key)) {
      seen.add(key);
      list.push(key);
    }
  }
  return list;
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
  const [pureRows, setPureRows] = useState<PureRow[]>([]);
  const [netappRows, setNetappRows] = useState<NetAppRow[]>([]);
  const [vastRows, setVastRows] = useState<VastRow[]>([]);
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
  const [checkSourcesActive, setCheckSourcesActive] = useState(false);
  const [view, setView] = useState<ViewMode>("energy");
  const [competitorVendor, setCompetitorVendor] = useState<CompetitorVendor>("NetApp");

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
          loadCsv(withBasePath("/data/energy/pure_flashblade_e.csv")),
          loadCsv(withBasePath("/data/energy/netapp_e_series.csv")),
        ]);
        if (cancelled) return;
        const pure = loadPure(pureCsv);
        const netapp = loadNetApp(netappCsv);
        setPureRows(pure);
        setNetappRows(netapp);
        try {
          const vastCsv = await loadCsv(withBasePath("/data/energy/vast_data.csv"));
          if (!cancelled) {
            setVastRows(loadVast(vastCsv));
          }
        } catch {
          if (!cancelled) {
            setVastRows([]);
          }
        }

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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCompatError(null);
        const compat = await loadNetAppDriveCompat(BASE_PATH);
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setVendorReportError(null);
        const res = await fetch(withBasePath("/data/energy/vendor_update_report.json"));
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMetaError(null);
        const res = await fetch(withBasePath("/data/energy/energy_data_meta.json"));
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
  }, []);

  const tracks = useMemo(() => getTracks(pureRows), [pureRows]);
  const capacities = useMemo(() => validCaps(pureRows, inputs.dfmTb, 20), [pureRows, inputs.dfmTb]);
  const competitorRows = useMemo(
    () => (competitorVendor === "NetApp" ? netappRows : vastRows),
    [competitorVendor, netappRows, vastRows],
  );
  const competitorLabel = competitorVendor;
  const effectiveMode: NetAppMode = competitorVendor === "Vast" ? "auto" : mode;
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
  const driveSizeOptions = useMemo(() => {
    if (competitorVendor === "Vast") return VAST_DRIVE_SIZES_TB;
    return effectiveMode === "manual" ? driveSizes : allDriveSizes;
  }, [allDriveSizes, competitorVendor, driveSizes, effectiveMode]);
  const manualDriveSizeMissing =
    competitorVendor === "NetApp" &&
    effectiveMode === "manual" &&
    manualInputs.controllerModel.length > 0 &&
    manualInputs.expansionModel.length > 0 &&
    driveSizes.length === 0;
  const manualApplyDisabled =
    competitorVendor === "NetApp" &&
    (loading ||
      manualInputs.controllerModel.length === 0 ||
      manualInputs.expansionModel.length === 0 ||
      manualDriveSizeMissing ||
      netappRows.length === 0);

  const lastVendorRef = useRef<CompetitorVendor>(competitorVendor);
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
      const competitorData = competitorVendor === "Vast" ? vastRows : netappRows;
      if (competitorData.length === 0) {
        setFb(fbResult);
        setCandidates([]);
        setSelected(null);
        lastVendorRef.current = competitorVendor;
        return;
      }
      const tolFrac = inputs.tolPct / 100;
      const candidateRows =
        competitorVendor === "Vast"
          ? enumerateVast(
              competitorData,
              fbResult.effectiveTb,
              inputs.naUtilPct / 100,
              inputs.naPue,
              inputs.naPrice,
              inputs.naOverhead,
              inputs.naDrr,
              inputs.naDriveSizeTb,
              tolFrac,
            )
          : enumerateNetApp(
              competitorData,
              fbResult.effectiveTb,
              inputs.naUtilPct / 100,
              inputs.naPue,
              inputs.naPrice,
              inputs.naOverhead,
              inputs.naDrr,
              inputs.naDriveSizeTb,
              tolFrac,
            );
      const vendorChanged = lastVendorRef.current !== competitorVendor;
      lastVendorRef.current = competitorVendor;
      setFb(fbResult);
      setCandidates(candidateRows);
      setSelected((prev) => {
        if (candidateRows.length === 0) return null;
        if (!vendorChanged && prev) {
          const match = candidateRows.find((candidate) => candidateKey(candidate) === candidateKey(prev));
          if (match) return match;
        }
        return candidateRows[0];
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
      setComputeError(err instanceof Error ? err.message : "Failed to compute manual configuration");
      setManualCandidate(null);
    }
  };

  useEffect(() => {
    if (competitorVendor === "Vast") {
      setMode("auto");
    }
    setCandidates([]);
    setSelected(null);
    setManualCandidate(null);
    setComputeError(null);
  }, [competitorVendor]);

  useEffect(() => {
    if (pureRows.length === 0) return;
    runModel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitorVendor, netappRows.length, pureRows.length, vastRows.length]);

  useEffect(() => {
    if (competitorVendor !== "NetApp") return;
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
    competitorVendor,
  ]);

  useEffect(() => {
    if (
      competitorVendor === "NetApp" &&
      effectiveMode === "manual" &&
      manualInputs.controllerModel &&
      manualInputs.expansionModel &&
      !manualDriveSizeMissing &&
      netappRows.length > 0
    ) {
      runManual();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    competitorVendor,
    effectiveMode,
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

  const selectedCandidate = effectiveMode === "manual" ? manualCandidate : selected;
  const sourceEntries = useMemo(() => {
    const entries: Array<{ model: string; url?: string; missingLabel?: string }> = [];
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
      const missingLabel = competitorVendor === "Vast" ? "Source: Not provided" : undefined;
      const controllerRow = competitorRows.find(
        (row) =>
          row.Component_Type === "Controller_Shelf" &&
          String(row.Model ?? "") === selectedCandidate.controllerModel,
      );
      entries.push({
        model: String(controllerRow?.Model ?? selectedCandidate.controllerModel),
        url: controllerRow?.Source_URL ? String(controllerRow.Source_URL) : undefined,
        missingLabel,
      });
      const expansionRow = competitorRows.find(
        (row) =>
          row.Component_Type === "Expansion_Shelf" &&
          String(row.Model ?? "") === selectedCandidate.expansionModel,
      );
      entries.push({
        model: String(expansionRow?.Model ?? selectedCandidate.expansionModel),
        url: expansionRow?.Source_URL ? String(expansionRow.Source_URL) : undefined,
        missingLabel,
      });
    }

    return entries;
  }, [competitorRows, competitorVendor, inputs.dfmTb, pureRows, selectedCandidate]);

  const sourceList = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ type: "link" | "missing"; label: string; url?: string; key: string }> = [];
    for (const [index, entry] of sourceEntries.entries()) {
      if (entry.url) {
        if (seen.has(entry.url)) continue;
        seen.add(entry.url);
        items.push({ type: "link", label: entry.url, url: entry.url, key: entry.url });
      } else {
        const label = entry.missingLabel ?? `Source missing for ${entry.model}`;
        items.push({ type: "missing", label, key: `${entry.model}-${index}` });
      }
    }
    return items;
  }, [sourceEntries]);

  const savings = useMemo(() => {
    if (!fb || !selectedCandidate) return null;
    const deltaW = fb.weightedW - selectedCandidate.weightedW;
    const deltaKwh = fb.kwhWithPue - selectedCandidate.kwhYearWithPue;
    const deltaCost = fb.annualCost - selectedCandidate.annualEnergyCost;
    const deltaEffectiveTb = fb.effectiveTb - selectedCandidate.effectiveTb;
    const deltaRackUnits =
      fb.rackUnits != null && selectedCandidate.rackUnits != null
        ? fb.rackUnits - selectedCandidate.rackUnits
        : null;
    return {
      deltaW,
      deltaKwh,
      deltaCost,
      deltaEffectiveTb,
      deltaRackUnits,
      pctCost: fb.annualCost > 0 ? (deltaCost / fb.annualCost) * 100 : null,
    };
  }, [fb, selectedCandidate]);

  const gridKgCo2ePerKwhRaw = process.env.NEXT_PUBLIC_GRID_KGCO2E_PER_KWH;
  const gridKgCo2ePerKwh = useMemo(() => {
    const parsed = Number(gridKgCo2ePerKwhRaw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_GRID_KGCO2E_PER_KWH;
  }, [gridKgCo2ePerKwhRaw]);
  const gridFactorSource =
    gridKgCo2ePerKwhRaw != null && Number.isFinite(Number(gridKgCo2ePerKwhRaw)) && Number(gridKgCo2ePerKwhRaw) > 0
      ? "env override"
      : "default";

  const fbCo2eKgPerYear = fb ? fb.kwhWithPue * gridKgCo2ePerKwh : null;
  const netappCo2eKgPerYear = selectedCandidate ? selectedCandidate.kwhYearWithPue * gridKgCo2ePerKwh : null;
  const fbCo2ePerTbYear =
    fb != null && fbCo2eKgPerYear != null && fb.effectiveTb > 0 ? fbCo2eKgPerYear / fb.effectiveTb : null;
  const netappCo2ePerTbYear =
    selectedCandidate != null && netappCo2eKgPerYear != null && selectedCandidate.effectiveTb > 0
      ? netappCo2eKgPerYear / selectedCandidate.effectiveTb
      : null;
  const deltaCo2eKgPerYear =
    fbCo2eKgPerYear != null && netappCo2eKgPerYear != null ? fbCo2eKgPerYear - netappCo2eKgPerYear : null;
  const deltaCo2ePerTbYear =
    fbCo2ePerTbYear != null && netappCo2ePerTbYear != null ? fbCo2ePerTbYear - netappCo2ePerTbYear : null;

  const formatCo2eYear = (kg: number | null) => (kg == null ? "—" : `${fmt2.format(kg / 1000)} tCO₂e/year`);
  const formatCo2ePerTbYear = (kg: number | null) =>
    kg == null ? "—" : `${fmt1.format(kg)} kgCO₂e / TB-year`;

  const totalsRowKeys = useMemo<RowKey[]>(() => {
    if (view === "energy") return [...energyTotalsRowKeys];
    if (view === "sustainability") return [...sustainabilityRowKeys];
    return combinedRowKeys(energyTotalsRowKeys, sustainabilityRowKeys);
  }, [view]);

  const rowLabels: Record<RowKey, string> = {
    effectiveTb: "Effective TB",
    weightedW: "Weighted IT load (W)",
    kwhPerYear: "kWh / year (with PUE)",
    annualCost: "Annual energy cost",
    costPct: "Cost %",
    btuPerHour: "BTU / hour",
    rackUnits: "Total rack units",
    co2eYear: "CO₂e / year",
    co2ePerTbYear: "CO₂e per effective TB-year (kgCO₂e)",
  };
  const rowUnits: Record<RowKey, string | null> = {
    effectiveTb: "TB",
    weightedW: "W",
    kwhPerYear: "kWh/year",
    annualCost: "USD/year",
    costPct: null,
    btuPerHour: "BTU/hour",
    rackUnits: "RU",
    co2eYear: "tCO₂e/year",
    co2ePerTbYear: "kgCO₂e/TB-year",
  };

  const fbRowValues: Partial<Record<RowKey, string>> | null = fb
    ? {
        effectiveTb: fmt0.format(fb.effectiveTb),
        weightedW: fmt0.format(fb.weightedW),
        kwhPerYear: fmt0.format(fb.kwhWithPue),
        annualCost: `$${fmt0.format(fb.annualCost)}`,
        costPct: "—",
        btuPerHour: fmt0.format(fb.btuPerHour),
        rackUnits: formatRackUnits(fb.rackUnits),
        co2eYear: formatCo2eYear(fbCo2eKgPerYear),
        co2ePerTbYear: formatCo2ePerTbYear(fbCo2ePerTbYear),
      }
    : null;

  const netappRowValues: Partial<Record<RowKey, string>> | null = selectedCandidate
    ? {
        effectiveTb: fmt0.format(selectedCandidate.effectiveTb),
        weightedW: fmt0.format(selectedCandidate.weightedW),
        kwhPerYear: fmt0.format(selectedCandidate.kwhYearWithPue),
        annualCost: `$${fmt0.format(selectedCandidate.annualEnergyCost)}`,
        costPct: "—",
        rackUnits: formatRackUnits(selectedCandidate.rackUnits),
        co2eYear: formatCo2eYear(netappCo2eKgPerYear),
        co2ePerTbYear: formatCo2ePerTbYear(netappCo2ePerTbYear),
      }
    : null;

  const deltaRowValues: Partial<Record<RowKey, string>> = {
    effectiveTb: savings?.deltaEffectiveTb == null ? "—" : fmt0.format(savings.deltaEffectiveTb),
    weightedW: savings?.deltaW == null ? "—" : fmt0.format(savings.deltaW),
    kwhPerYear: savings?.deltaKwh == null ? "—" : fmt0.format(savings.deltaKwh),
    annualCost: savings?.deltaCost == null ? "—" : `$${fmt0.format(savings.deltaCost)}`,
    costPct:
      view !== "sustainability" && savings?.pctCost != null ? `${fmt1.format(savings.pctCost)}%` : "—",
    rackUnits: savings?.deltaRackUnits == null ? "—" : fmt0.format(savings.deltaRackUnits),
    co2eYear: formatCo2eYear(deltaCo2eKgPerYear),
    co2ePerTbYear: formatCo2ePerTbYear(deltaCo2ePerTbYear),
  };

  const comparePrimaryKeys = view === "sustainability" ? sustainabilityRowKeys : energyRowKeys;
  const compareSecondaryKeys =
    view === "both" ? sustainabilityRowKeys.filter((key) => !energyRowKeySet.has(key)) : [];
  const buildCompareItems = (
    keys: readonly RowKey[],
    values: Partial<Record<RowKey, string>> | null,
    prefix?: string,
  ): Array<[string, string]> =>
    keys.map(
      (key): [string, string] => [
        prefix ? `${prefix} ${rowLabels[key]}` : rowLabels[key],
        values?.[key] ?? "—",
      ],
    );

  const handleCheckSources = async () => {
    const command = "node ui/partner-hub/scripts/check-vendor-sources.mjs";
    if (checkSourcesActive) {
      setCheckSourcesActive(false);
      setSourceCheckHint(null);
      return;
    }
    setCheckSourcesActive(true);
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

  const fbRackUnitsMissing = fb?.rackUnits == null;
  const selectedRackUnitsMissing = selectedCandidate?.rackUnits == null;
  const candidateTableRackUnitsMissing = useMemo(
    () => effectiveMode === "auto" && candidates.slice(0, 8).some((candidate) => candidate.rackUnits == null),
    [candidates, effectiveMode],
  );
  const toggleButtonClass = (isActive: boolean) =>
    [
      "inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      isActive
        ? "border-button-primary bg-button-primary text-button-primary-foreground hover:bg-button-primary/90 ring-1 ring-button-primary/30"
        : "border-border bg-background text-foreground hover:bg-muted/50",
    ].join(" ");
  const expansionLabel = competitorVendor === "Vast" ? "unit" : "shelf";
  const expansionLabelPlural = competitorVendor === "Vast" ? "units" : "shelves";
  const expansionHeaderLabel = competitorVendor === "Vast" ? "Exp units" : "Exp shelves";
  const expansionLabelFor = (qty: number) => (qty === 1 ? expansionLabel : expansionLabelPlural);
  const selectedConfigLabel = selectedCandidate
    ? `${selectedCandidate.controllerModel} + ${selectedCandidate.expansionQty} ${expansionLabelFor(
        selectedCandidate.expansionQty,
      )} (${selectedCandidate.expansionModel})`
    : null;

  return (
    <div className="space-y-8 md:space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Energy Tool</h1>
        <p className="max-w-2xl text-base text-foreground/70">
          Compare annual energy consumption and cost between a FlashBlade//E configuration and a {competitorLabel} baseline.
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
                <label className={LABEL_CLASSES}>DFM size (TB)</label>
                <select
                  className={INPUT_BASE_CLASSES}
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
                <label className={LABEL_CLASSES}>Capacity (Usable PB)</label>
                <select
                  className={INPUT_BASE_CLASSES}
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
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{competitorLabel} baseline inputs</CardTitle>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
              <span>Competitor vendor</span>
              <select
                className={`${INPUT_BASE_CLASSES} w-32`}
                value={competitorVendor}
                onChange={(e) => setCompetitorVendor(e.target.value as CompetitorVendor)}
                disabled={loading}
              >
                <option value="NetApp">NetApp</option>
                <option value="Vast">Vast</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {competitorVendor === "NetApp" ? (
              <div className="flex w-full rounded-lg border border-border/70 bg-background p-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
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
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <NumberInput label="Utilization %" value={inputs.naUtilPct} onChange={(v) => setInputs((p) => ({ ...p, naUtilPct: v }))} />
              <NumberInput label="PUE" value={inputs.naPue} step={0.01} onChange={(v) => setInputs((p) => ({ ...p, naPue: v }))} />
              <NumberInput label="$ / kWh" value={inputs.naPrice} step={0.001} onChange={(v) => setInputs((p) => ({ ...p, naPrice: v }))} />
              <NumberInput label="Overhead (raw→usable)" value={inputs.naOverhead} step={0.01} onChange={(v) => setInputs((p) => ({ ...p, naOverhead: v }))} />
              <NumberInput label="DRR" value={inputs.naDrr} step={0.1} onChange={(v) => setInputs((p) => ({ ...p, naDrr: v }))} />
              <div className="space-y-1">
                <label className={LABEL_CLASSES}>Drive size (TB)</label>
                <select
                  className={INPUT_BASE_CLASSES}
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
              {effectiveMode === "auto" ? (
                <NumberInput label="Auto-match tolerance (±%)" value={inputs.tolPct} step={0.1} onChange={(v) => setInputs((p) => ({ ...p, tolPct: v }))} />
              ) : null}
            </div>

            {effectiveMode === "manual" && competitorVendor === "NetApp" ? (
              <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  Manual configuration
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className={LABEL_CLASSES}>Controller model</label>
                    <select
                      className={INPUT_BASE_CLASSES}
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
                    <label className={LABEL_CLASSES}>Expansion {expansionLabel} model</label>
                    <select
                      className={INPUT_BASE_CLASSES}
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
                    label={`# of expansion ${expansionLabelPlural}`}
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

            {/* Controls: stacked buttons (normal sizing; do not stretch full width) */}
            <div className="grid gap-2 justify-items-start">
              {effectiveMode === "auto" ? (
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-button-primary px-4 text-sm font-semibold text-button-primary-foreground transition hover:bg-button-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-muted disabled:text-foreground/50"
                  onClick={runModel}
                  disabled={loading || pureRows.length === 0 || competitorRows.length === 0}
                >
                  Recalculate
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-button-primary px-4 text-sm font-semibold text-button-primary-foreground transition hover:bg-button-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-muted disabled:text-foreground/50"
                  onClick={runManual}
                  disabled={manualApplyDisabled}
                >
                  Apply manual config
                </button>
              )}
              <button
                type="button"
                className={toggleButtonClass(assumptionsOpen)}
                onClick={() => setAssumptionsOpen((prev) => !prev)}
                aria-pressed={assumptionsOpen}
              >
                Assumptions &amp; Sources
              </button>
              <button
                type="button"
                className={toggleButtonClass(checkSourcesActive)}
                onClick={handleCheckSources}
                aria-pressed={checkSourcesActive}
              >
                Check Sources (local)
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {loading ? <span className="text-xs text-foreground/60">Loading datasets…</span> : null}
              {computeError ? <span className="text-xs font-semibold text-red-600">{computeError}</span> : null}
              {sourceCheckHint ? <span className="text-xs text-foreground/60">{sourceCheckHint}</span> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {fb ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">View</div>
            <div className="flex rounded-lg border border-border/70 bg-background p-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
              <button
                type="button"
                className={
                  "flex-1 rounded-sm px-3 py-2 transition " +
                  (view === "energy" ? "bg-muted text-foreground shadow-sm" : "hover:bg-muted/50")
                }
                onClick={() => setView("energy")}
              >
                Energy
              </button>
              <button
                type="button"
                className={
                  "flex-1 rounded-sm px-3 py-2 transition " +
                  (view === "sustainability" ? "bg-muted text-foreground shadow-sm" : "hover:bg-muted/50")
                }
                onClick={() => setView("sustainability")}
              >
                Sustainability
              </button>
              <button
                type="button"
                className={
                  "flex-1 rounded-sm px-3 py-2 transition " +
                  (view === "both" ? "bg-muted text-foreground shadow-sm" : "hover:bg-muted/50")
                }
                onClick={() => setView("both")}
              >
                Both
              </button>
            </div>
          </div>
          {view !== "energy" ? (
            <div className="text-xs text-foreground/60">
              Carbon intensity: {fmt2.format(gridKgCo2ePerKwh)} kgCO₂e/kWh ({gridFactorSource})
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">FlashBlade//E totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {totalsRowKeys.map((key) => (
                  <Metric key={key} label={rowLabels[key]} value={fbRowValues?.[key] ?? "—"} />
                ))}
                <div className="pt-2 text-xs text-foreground/60">
                  Composition: {fb.ecQty}×EC, {fb.exQty}×EX, {fb.xfmQty}×XFM
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {effectiveMode === "auto"
                    ? `${competitorLabel} candidates (within tolerance)`
                    : `${competitorLabel} candidates`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {effectiveMode === "auto" ? (
                  <>
                    {band ? (
                      <p className="mb-3 text-xs text-foreground/60">
                        Target band: {fmt0.format(band.low)}–{fmt0.format(band.high)} effective TB (±{fmt1.format(inputs.tolPct)}%).
                      </p>
                    ) : null}
                    {candidates.length === 0 ? (
                      <p className="text-sm text-foreground/70">
                        {competitorVendor === "Vast"
                          ? `No Vast candidates found within ±${fmt1.format(inputs.tolPct)}%.`
                          : `No NetApp candidates found within ±${fmt1.format(inputs.tolPct)}%.`}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-border text-foreground/60">
                            <tr>
                              <th className="py-2 pr-3 font-semibold">Controller</th>
                              <th className="py-2 pr-3 font-semibold">{expansionHeaderLabel}</th>
                              <th className="py-2 pr-3 font-semibold whitespace-nowrap">Total rack units</th>
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
                                  aria-pressed={isSelected}
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
                                  <td className="py-2 pr-3">
                                    {c.expansionQty} {expansionLabelFor(c.expansionQty)}
                                  </td>
                                  <td className="py-2 pr-3">{formatRackUnits(c.rackUnits)}</td>
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
                          Click a {competitorLabel} row to see a side-by-side comparison.
                        </p>
                        {candidateTableRackUnitsMissing ? (
                          <p className="mt-1 text-[11px] text-foreground/60">
                            Some candidate rows are missing rack unit data, so totals display as —.
                          </p>
                        ) : null}
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
          {fbRackUnitsMissing || selectedRackUnitsMissing ? (
            <p className="text-xs text-foreground/60">
              Rack unit data is missing for one or more selected rows, so totals display as —.
            </p>
          ) : null}

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Comparison</CardTitle>
              {selectedCandidate ? (
                <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  SELECTED: {selectedConfigLabel}
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              {selectedCandidate ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <MiniCompare
                    title="FlashBlade//E"
                    items={buildCompareItems(comparePrimaryKeys, fbRowValues)}
                    groupedItems={
                      view === "both" ? buildCompareItems(compareSecondaryKeys, fbRowValues) : undefined
                    }
                    groupedLabel={view === "both" ? "Sustainability" : undefined}
                  />
                  <MiniCompare
                    title={competitorLabel}
                    items={buildCompareItems(comparePrimaryKeys, netappRowValues)}
                    groupedItems={
                      view === "both" ? buildCompareItems(compareSecondaryKeys, netappRowValues) : undefined
                    }
                    groupedLabel={view === "both" ? "Sustainability" : undefined}
                  />
                  <MiniCompare
                    title={`Δ (Pure − ${competitorLabel})`}
                    items={buildCompareItems(comparePrimaryKeys, deltaRowValues, "Δ")}
                    groupedItems={
                      view === "both" ? buildCompareItems(compareSecondaryKeys, deltaRowValues, "Δ") : undefined
                    }
                    groupedLabel={view === "both" ? "Sustainability" : undefined}
                  />
                </div>
              ) : (
                <p className="text-sm text-foreground/70">
                  {effectiveMode === "manual"
                    ? `Apply a manual ${competitorLabel} configuration to see the comparison.`
                    : `Select a ${competitorLabel} candidate to see the comparison.`}
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
                  <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    {competitorVendor === "Vast" ? "Vast baseline" : "NetApp baseline"}
                  </div>
                  <ul className="mt-2 space-y-1">
                    <li>Utilization: {fmt1.format(inputs.naUtilPct)}%</li>
                    <li>PUE: {fmt2.format(inputs.naPue)}</li>
                    <li>$ / kWh: ${fmt2.format(inputs.naPrice)}</li>
                    <li>Overhead (raw→usable): {fmt2.format(inputs.naOverhead)}</li>
                    <li>DRR: {fmt2.format(inputs.naDrr)}</li>
                    <li>
                      Drive size selection: {fmt0.format(inputs.naDriveSizeTb)} TB{" "}
                      {competitorVendor === "NetApp"
                        ? effectiveMode === "manual"
                          ? "(compat pairing)"
                          : "(compat list)"
                        : "(default list)"}
                    </li>
                    <li>
                      Selected config:{" "}
                      {selectedCandidate ? selectedConfigLabel : `No ${competitorLabel} candidate selected`}
                    </li>
                  </ul>
                  {competitorVendor === "Vast" ? (
                    <div className="mt-2 space-y-1 text-xs text-foreground/60">
                      <p>Modeled as base cluster + expansion units from vast_data.csv</p>
                      <p>Only Controller_Shelf + Expansion_Shelf are included in energy totals</p>
                      <p>
                        Rows like Network_Fabric / Mgmt_Network are listed for completeness but NOT included in current
                        energy totals
                      </p>
                      <p>Idle watts may be derived from Typical via Default_Idle_Factor when vendor idle is not provided</p>
                    </div>
                  ) : null}
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
                      <li key={item.key}>
                        <a className="text-primary underline-offset-2 hover:underline" href={item.url} target="_blank" rel="noreferrer">
                          {item.label}
                        </a>
                      </li>
                    ) : (
                      <li key={item.key} className="text-foreground/70">
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
  groupedItems,
  groupedLabel,
}: {
  title: string;
  items: Array<[string, string]>;
  groupedItems?: Array<[string, string]>;
  groupedLabel?: string;
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
      {groupedItems && groupedItems.length > 0 ? (
        <div className="mt-3 rounded-md border border-border/60 bg-muted/20 p-3">
          {groupedLabel ? (
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
              {groupedLabel}
            </div>
          ) : null}
          <div className="space-y-2 text-sm">
            {groupedItems.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <span className="text-foreground/60">{k}</span>
                <span className="font-semibold text-foreground">{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
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
      <label className={LABEL_CLASSES}>{label}</label>
      <input
        type="number"
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={INPUT_BASE_CLASSES}
      />
    </div>
  );
}
