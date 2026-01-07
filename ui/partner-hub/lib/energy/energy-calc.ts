import { parseCsv, type CsvRow } from "./csv";

const toFloat = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toInt = (v: unknown, fallback = 0) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : fallback;
};

export type PureRow = CsvRow & {
  DFM_Size_TB: number;
  Typical_W: number;
  Idle_W: number;
  Min_Usable_PB: number;
  Capacity_Increment_PB: number;
  Min_EC_Chassis: number;
  Min_EX_Chassis: number;
  Min_XFMs: number;
  Max_Total_Chassis: number;
};

export type NetAppRow = CsvRow & {
  Typical_W: number;
  Idle_W: number;
  Drives_per_unit: number;
  Rack_Units: number;
};

export type PowerModel = {
  model: string;
  typicalW: number;
  idleW: number;
  weightedW: (util: number) => number;
};

export async function loadCsv(url: string): Promise<CsvRow[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load CSV: ${url} (${res.status})`);
  }
  const text = await res.text();
  return parseCsv(text);
}

export function loadPure(rows: CsvRow[]): PureRow[] {
  return rows.map((r) => {
    const out: PureRow = {
      ...r,
      DFM_Size_TB: toInt(r.DFM_Size_TB),
      Typical_W: toFloat(r.Typical_W),
      Idle_W: toFloat(r.Idle_W),
      Min_Usable_PB: toFloat(r.Min_Usable_PB),
      Capacity_Increment_PB: toFloat(r.Capacity_Increment_PB),
      Min_EC_Chassis: toInt(r.Min_EC_Chassis, 1),
      Min_EX_Chassis: toInt(r.Min_EX_Chassis, 1),
      Min_XFMs: toInt(r.Min_XFMs, 2),
      Max_Total_Chassis: toInt(r.Max_Total_Chassis, 999),
    };
    return out;
  });
}

export function loadNetApp(rows: CsvRow[]): NetAppRow[] {
  return rows.map((r) => {
    const out: NetAppRow = {
      ...r,
      Typical_W: toFloat(r.Typical_W),
      Idle_W: toFloat(r.Idle_W),
      Drives_per_unit: toFloat(r.Drives_per_unit),
      Rack_Units: toFloat(r.Rack_Units),
    };
    return out;
  });
}

export function getTracks(pureRows: PureRow[]): number[] {
  return Array.from(new Set(pureRows.map((r) => r.DFM_Size_TB))).sort((a, b) => a - b);
}

export function validCaps(pureRows: PureRow[], dfmTb: number, maxPoints = 20): number[] {
  const g = pureRows.filter((r) => r.DFM_Size_TB === dfmTb);
  if (g.length === 0) return [];
  const minPb = g[0].Min_Usable_PB;
  const inc = g[0].Capacity_Increment_PB;
  return Array.from({ length: maxPoints }, (_, i) => Number((minPb + i * inc).toFixed(2)));
}

function fbComp(pureRows: PureRow[], dfmTb: number, capacityPb: number) {
  const g = pureRows.filter((r) => r.DFM_Size_TB === dfmTb);
  if (g.length === 0) throw new Error("No FlashBlade rows for DFM track");
  const base = g[0];
  const minEc = base.Min_EC_Chassis || 1;
  const minEx = base.Min_EX_Chassis || 1;
  const minXfm = base.Min_XFMs || 2;
  const minPb = base.Min_Usable_PB || 0;
  const incPb = base.Capacity_Increment_PB || 0;
  const maxTotal = base.Max_Total_Chassis || 999;

  if (capacityPb < minPb - 1e-9) throw new Error("capacity too low");
  const nIncFloat = incPb > 0 ? (capacityPb - minPb) / incPb : 0;
  const nInc = Math.round(nIncFloat + 1e-9);
  if (Math.abs(nInc - nIncFloat) > 1e-6) throw new Error("invalid capacity point");

  let ecQty = minEc;
  let exQty = minEx + nInc;
  const xfmQty = Math.max(minXfm, 2);
  if (ecQty + exQty > maxTotal) {
    exQty = maxTotal - ecQty;
  }
  return { ecQty, exQty, xfmQty };
}

function compPower(pureRows: PureRow[], dfmTb: number, nameContains: string): PowerModel {
  const needle = nameContains.toLowerCase();
  const g = pureRows.filter(
    (r) => r.DFM_Size_TB === dfmTb && String(r.Model ?? "").toLowerCase().includes(needle),
  );
  if (g.length === 0) throw new Error(`Missing power row for ${nameContains}`);
  const r = g[0];
  return {
    model: String(r.Model ?? ""),
    typicalW: r.Typical_W,
    idleW: r.Idle_W,
    weightedW: (util) => r.Idle_W + util * (r.Typical_W - r.Idle_W),
  };
}

const kwhYear = (w: number) => (w * 8760) / 1000;
const btuPerHour = (w: number) => w * 3.412;

export type FbPowerResult = {
  dfmTb: number;
  capacityPb: number;
  ecQty: number;
  exQty: number;
  xfmQty: number;
  weightedW: number;
  kwhIt: number;
  kwhWithPue: number;
  annualCost: number;
  btuPerHour: number;
  effectiveTb: number;
  components: {
    EC: { qty: number; model: string; idleWPer: number; typicalWPer: number; weightedWPer: number };
    EX: { qty: number; model: string; idleWPer: number; typicalWPer: number; weightedWPer: number };
    XFM: { qty: number; model: string; idleWPer: number; typicalWPer: number; weightedWPer: number };
  };
};

export function fbPower(
  pureRows: PureRow[],
  dfmTb: number,
  capacityPb: number,
  util: number,
  pue: number,
  price: number,
  drr: number,
): FbPowerResult {
  const { ecQty, exQty, xfmQty } = fbComp(pureRows, dfmTb, capacityPb);
  const ecP = compPower(pureRows, dfmTb, "EC chassis");
  const exP = compPower(pureRows, dfmTb, "EX chassis");
  const xfmP = compPower(pureRows, dfmTb, "XFM");

  const w = ecQty * ecP.weightedW(util) + exQty * exP.weightedW(util) + xfmQty * xfmP.weightedW(util);
  const kwhIt = kwhYear(w);
  const kwhWithPue = kwhIt * pue;
  const annualCost = kwhWithPue * price;

  return {
    dfmTb,
    capacityPb,
    ecQty,
    exQty,
    xfmQty,
    weightedW: w,
    kwhIt,
    kwhWithPue,
    annualCost,
    btuPerHour: btuPerHour(w),
    effectiveTb: capacityPb * 1000 * drr,
    components: {
      EC: {
        qty: ecQty,
        model: ecP.model,
        idleWPer: ecP.idleW,
        typicalWPer: ecP.typicalW,
        weightedWPer: ecP.weightedW(util),
      },
      EX: {
        qty: exQty,
        model: exP.model,
        idleWPer: exP.idleW,
        typicalWPer: exP.typicalW,
        weightedWPer: exP.weightedW(util),
      },
      XFM: {
        qty: xfmQty,
        model: xfmP.model,
        idleWPer: xfmP.idleW,
        typicalWPer: xfmP.typicalW,
        weightedWPer: xfmP.weightedW(util),
      },
    },
  };
}

export type NetAppCandidate = {
  controllerModel: string;
  expansionModel: string;
  controllerQty: number;
  expansionQty: number;
  effectiveTb: number;
  pctDiffFromTarget: number;
  weightedW: number;
  kwhYearWithPue: number;
  annualEnergyCost: number;
  wPerEffectiveTb: number | null;
  dollarsPerEffectiveTbYear: number | null;
  kwhPerEffectiveTbYear: number | null;
};

const allowedNetAppControllers = new Set(["E2860", "E5760", "E4060"]);

type NetAppShelfPower = {
  model: string;
  typicalW: number;
  idleW: number;
  drives: number;
  weightedW: (util: number) => number;
};

function getExpansionShelf(netappRows: NetAppRow[]): NetAppShelfPower {
  const expRows = netappRows.filter(
    (r) => r.Component_Type === "Expansion_Shelf" && String(r.Model ?? "").includes("DE460C"),
  );
  const exp = expRows.find((r) => String(r.Model).trim() === "DE460C 60-bay") ?? expRows[0];
  if (!exp) throw new Error("No DE460C expansion shelf found");
  return {
    model: String(exp.Model),
    typicalW: exp.Typical_W,
    idleW: exp.Idle_W,
    drives: toInt(exp.Drives_per_unit),
    weightedW: (u: number) => exp.Idle_W + u * (exp.Typical_W - exp.Idle_W),
  };
}

function getControllerRows(netappRows: NetAppRow[]): NetAppRow[] {
  return netappRows.filter(
    (r) => r.Component_Type === "Controller_Shelf" && allowedNetAppControllers.has(String(r.Model ?? "")),
  );
}

export function getNetAppControllerModels(netappRows: NetAppRow[]): string[] {
  const models = getControllerRows(netappRows).map((r) => String(r.Model));
  return Array.from(new Set(models)).sort((a, b) => a.localeCompare(b));
}

export function buildNetAppCandidate(
  netappRows: NetAppRow[],
  controllerModel: string,
  expansionQty: number,
  util: number,
  pue: number,
  price: number,
  overhead: number,
  drr: number,
  driveTb: number,
): NetAppCandidate {
  const exp = getExpansionShelf(netappRows);
  const ctrl = getControllerRows(netappRows).find((row) => String(row.Model) === controllerModel);
  if (!ctrl) {
    throw new Error(`Unknown controller model: ${controllerModel}`);
  }
  const ctrlWeighted = (u: number) => ctrl.Idle_W + u * (ctrl.Typical_W - ctrl.Idle_W);
  const ctrlDrives = toInt(ctrl.Drives_per_unit);

  const totalDrives = ctrlDrives + expansionQty * exp.drives;
  const raw = totalDrives * driveTb;
  const usable = raw * (1 - overhead);
  const eff = usable * drr;

  const w = ctrlWeighted(util) + expansionQty * exp.weightedW(util);
  const kwhPue = kwhYear(w) * pue;
  const annual = kwhPue * price;

  return {
    controllerModel,
    expansionModel: exp.model,
    controllerQty: 1,
    expansionQty,
    effectiveTb: eff,
    pctDiffFromTarget: 0,
    weightedW: w,
    kwhYearWithPue: kwhPue,
    annualEnergyCost: annual,
    wPerEffectiveTb: eff > 0 ? w / eff : null,
    dollarsPerEffectiveTbYear: eff > 0 ? annual / eff : null,
    kwhPerEffectiveTbYear: eff > 0 ? kwhPue / eff : null,
  };
}

export function enumerateNetApp(
  netappRows: NetAppRow[],
  targetEffTb: number,
  util: number,
  pue: number,
  price: number,
  overhead: number,
  drr: number,
  driveTb: number,
  tolFrac = 0.1,
): NetAppCandidate[] {
  const exp = getExpansionShelf(netappRows);
  const ctrlRows = getControllerRows(netappRows);

  const out: NetAppCandidate[] = [];
  for (const ctrl of ctrlRows) {
    const ctrlModel = String(ctrl.Model);
    const ctrlTypical = ctrl.Typical_W;
    const ctrlIdle = ctrl.Idle_W;
    const ctrlDrives = toInt(ctrl.Drives_per_unit);
    const ctrlWeighted = (u: number) => ctrlIdle + u * (ctrlTypical - ctrlIdle);

    for (let expQty = 0; expQty <= 10; expQty += 1) {
      const totalDrives = ctrlDrives + expQty * exp.drives;
      const raw = totalDrives * driveTb;
      const usable = raw * (1 - overhead);
      const eff = usable * drr;

      const w = ctrlWeighted(util) + expQty * exp.weightedW(util);
      const kwhPue = kwhYear(w) * pue;
      const annual = kwhPue * price;
      const pct = targetEffTb > 0 ? ((eff - targetEffTb) / targetEffTb) * 100 : 0;

      if (Math.abs(pct) <= tolFrac * 100 + 1e-9) {
        out.push({
          controllerModel: ctrlModel,
          expansionModel: exp.model,
          controllerQty: 1,
          expansionQty: expQty,
          effectiveTb: eff,
          pctDiffFromTarget: pct,
          weightedW: w,
          kwhYearWithPue: kwhPue,
          annualEnergyCost: annual,
          wPerEffectiveTb: eff > 0 ? w / eff : null,
          dollarsPerEffectiveTbYear: eff > 0 ? annual / eff : null,
          kwhPerEffectiveTbYear: eff > 0 ? kwhPue / eff : null,
        });
      }
    }
  }

  out.sort((a, b) => {
    const da = Math.abs(a.pctDiffFromTarget);
    const db = Math.abs(b.pctDiffFromTarget);
    if (da !== db) return da - db;
    return a.annualEnergyCost - b.annualEnergyCost;
  });
  return out;
}
