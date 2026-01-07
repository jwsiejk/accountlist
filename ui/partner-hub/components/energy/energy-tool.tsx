"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  enumerateNetApp,
  fbPower,
  getTracks,
  loadCsv,
  loadNetApp,
  loadPure,
  validCaps,
  type FbPowerResult,
  type NetAppCandidate,
  type NetAppRow,
  type PureRow,
} from "@/lib/energy/energy-calc";

const fmt0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const fmt2 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [inputs, setInputs] = useState<Inputs>(() => ({
    dfmTb: 48,
    capacityPb: 4,
    ...defaults,
  }));

  const [fb, setFb] = useState<FbPowerResult | null>(null);
  const [candidates, setCandidates] = useState<NetAppCandidate[]>([]);
  const [selected, setSelected] = useState<NetAppCandidate | null>(null);
  const [computeError, setComputeError] = useState<string | null>(null);

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

  const tracks = useMemo(() => getTracks(pureRows), [pureRows]);
  const capacities = useMemo(() => validCaps(pureRows, inputs.dfmTb, 20), [pureRows, inputs.dfmTb]);

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
      setSelected(netapp[0] ?? null);
    } catch (err) {
      setComputeError(err instanceof Error ? err.message : "Failed to compute results");
      setFb(null);
      setCandidates([]);
      setSelected(null);
    }
  };

  useEffect(() => {
    if (pureRows.length > 0 && netappRows.length > 0) {
      runModel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pureRows.length, netappRows.length]);

  const band = useMemo(() => {
    if (!fb) return null;
    const tolFrac = inputs.tolPct / 100;
    return {
      low: fb.effectiveTb * (1 - tolFrac),
      high: fb.effectiveTb * (1 + tolFrac),
    };
  }, [fb, inputs.tolPct]);

  const netappBtu = useMemo(() => (selected ? Math.round(selected.weightedW * 3.412) : null), [selected]);

  const savings = useMemo(() => {
    if (!fb || !selected) return null;
    const deltaW = fb.weightedW - selected.weightedW;
    const deltaKwh = fb.kwhWithPue - selected.kwhYearWithPue;
    const deltaCost = fb.annualCost - selected.annualEnergyCost;
    return {
      deltaW,
      deltaKwh,
      deltaCost,
      pctCost: fb.annualCost > 0 ? (deltaCost / fb.annualCost) * 100 : null,
    };
  }, [fb, selected]);

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
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberInput label="Utilization %" value={inputs.naUtilPct} onChange={(v) => setInputs((p) => ({ ...p, naUtilPct: v }))} />
              <NumberInput label="PUE" value={inputs.naPue} step={0.01} onChange={(v) => setInputs((p) => ({ ...p, naPue: v }))} />
              <NumberInput label="$ / kWh" value={inputs.naPrice} step={0.001} onChange={(v) => setInputs((p) => ({ ...p, naPrice: v }))} />
              <NumberInput label="Overhead (raw→usable)" value={inputs.naOverhead} step={0.01} onChange={(v) => setInputs((p) => ({ ...p, naOverhead: v }))} />
              <NumberInput label="DRR" value={inputs.naDrr} step={0.1} onChange={(v) => setInputs((p) => ({ ...p, naDrr: v }))} />
              <NumberInput label="Drive size (TB)" value={inputs.naDriveSizeTb} step={1} onChange={(v) => setInputs((p) => ({ ...p, naDriveSizeTb: v }))} />
              <NumberInput label="Auto-match tolerance (±%)" value={inputs.tolPct} step={0.1} onChange={(v) => setInputs((p) => ({ ...p, tolPct: v }))} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                onClick={runModel}
                disabled={loading || pureRows.length === 0 || netappRows.length === 0}
              >
                Recalculate
              </button>
              {loading ? <span className="text-xs text-foreground/60">Loading datasets…</span> : null}
              {computeError ? <span className="text-xs font-semibold text-red-600">{computeError}</span> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {fb ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">FlashBlade//E totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Metric label="Effective TB" value={fmt0.format(fb.effectiveTb)} />
              <Metric label="Weighted IT load (W)" value={fmt0.format(fb.weightedW)} />
              <Metric label="kWh / year (with PUE)" value={fmt0.format(fb.kwhWithPue)} />
              <Metric label="Annual energy cost" value={`$${fmt0.format(fb.annualCost)}`} />
              <Metric label="BTU / hour" value={fmt0.format(fb.btuPerHour)} />
              <div className="pt-2 text-xs text-foreground/60">
                Composition: {fb.ecQty}×EC, {fb.exQty}×EX, {fb.xfmQty}×XFM
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">NetApp candidates (within tolerance)</CardTitle>
            </CardHeader>
            <CardContent>
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
                        <th className="py-2 pr-3 font-semibold">Eff TB</th>
                        <th className="py-2 pr-3 font-semibold">Δ vs target</th>
                        <th className="py-2 pr-3 font-semibold">Annual $</th>
                        <th className="py-2 pr-3 font-semibold">W / eff TB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.slice(0, 8).map((c) => {
                        const isSelected =
                          selected?.controllerModel === c.controllerModel &&
                          selected?.expansionQty === c.expansionQty;
                        return (
                        <tr
                          key={`${c.controllerModel}-${c.expansionQty}`}
                          className={
                            "border-b border-border/60 cursor-pointer hover:bg-muted/40 " +
                            (isSelected ? "bg-muted/50" : "")
                          }
                          onClick={() => setSelected(c)}
                          role="button"
                          tabIndex={0}
                        >
                          <td className="py-2 pr-3 font-medium">{c.controllerModel}</td>
                          <td className="py-2 pr-3">{c.expansionQty}</td>
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

              {selected ? (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    Selected: {selected.controllerModel} + {selected.expansionQty} shelf{selected.expansionQty === 1 ? "" : "es"}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <MiniCompare
                      title="FlashBlade//E"
                      items={[
                        ["Effective TB", fmt0.format(fb.effectiveTb)],
                        ["Weighted IT load (W)", fmt0.format(fb.weightedW)],
                        ["kWh / year (with PUE)", fmt0.format(fb.kwhWithPue)],
                        ["Annual energy cost", `$${fmt0.format(fb.annualCost)}`],
                      ]}
                    />
                    <MiniCompare
                      title="NetApp"
                      items={[
                        ["Effective TB", fmt0.format(selected.effectiveTb)],
                        ["Weighted IT load (W)", fmt0.format(selected.weightedW)],
                        ["kWh / year (with PUE)", fmt0.format(selected.kwhYearWithPue)],
                        ["Annual energy cost", `$${fmt0.format(selected.annualEnergyCost)}`],
                      ]}
                    />
                    <MiniCompare
                      title="Δ (Pure − NetApp)"
                      items={[
                        ["Δ IT load (W)", fmt0.format(savings?.deltaW ?? 0)],
                        ["Δ kWh / year", fmt0.format(savings?.deltaKwh ?? 0)],
                        ["Δ annual cost", `$${fmt0.format(savings?.deltaCost ?? 0)}`],
                        ["Δ cost %", savings?.pctCost == null ? "—" : `${fmt1.format(savings.pctCost)}%`],
                      ]}
                    />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
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
