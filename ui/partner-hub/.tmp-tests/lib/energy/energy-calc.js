"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCsv = loadCsv;
exports.loadPure = loadPure;
exports.loadNetApp = loadNetApp;
exports.loadVast = loadVast;
exports.getTracks = getTracks;
exports.validCaps = validCaps;
exports.fbPower = fbPower;
exports.getNetAppControllerModels = getNetAppControllerModels;
exports.buildNetAppCandidate = buildNetAppCandidate;
exports.enumerateNetApp = enumerateNetApp;
exports.enumerateVast = enumerateVast;
const csv_1 = require("./csv");
const toFloat = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
};
const toOptionalFloat = (v) => {
    if (v == null)
        return null;
    if (typeof v === "string" && v.trim() === "")
        return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};
const toInt = (v, fallback = 0) => {
    const n = Math.trunc(Number(v));
    return Number.isFinite(n) ? n : fallback;
};
async function loadCsv(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to load CSV: ${url} (${res.status})`);
    }
    const text = await res.text();
    return (0, csv_1.parseCsv)(text);
}
function loadPure(rows) {
    return rows.map((r) => {
        const out = {
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
            // Rack_Units is optional in source CSVs; keep null so the UI shows — and can warn intentionally.
            Rack_Units: toOptionalFloat(r.Rack_Units),
        };
        return out;
    });
}
function loadNetApp(rows) {
    return rows.map((r) => {
        const out = {
            ...r,
            Typical_W: toFloat(r.Typical_W),
            Idle_W: toFloat(r.Idle_W),
            Drives_per_unit: toFloat(r.Drives_per_unit),
            // Rack_Units is optional in source CSVs; keep null so the UI shows — and can warn intentionally.
            Rack_Units: toOptionalFloat(r.Rack_Units),
        };
        return out;
    });
}
const toBool = (v) => {
    if (typeof v === "boolean")
        return v;
    if (typeof v === "number")
        return v === 1;
    if (typeof v === "string") {
        const t = v.trim().toLowerCase();
        return t === "true" || t === "yes" || t === "1";
    }
    return false;
};
const isValidNumber = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
function loadVast(rows) {
    return rows.map((r) => {
        const out = {
            ...r,
            Typical_W: toFloat(r.Typical_W),
            Idle_W: toFloat(r.Idle_W),
            Drives_per_unit: toFloat(r.Drives_per_unit),
            // Rack_Units is optional in source CSVs; keep null so the UI shows — and can warn intentionally.
            Rack_Units: toOptionalFloat(r.Rack_Units),
            Auto_Default: toBool(r.Auto_Default),
        };
        return out;
    });
}
function getTracks(pureRows) {
    return Array.from(new Set(pureRows.map((r) => r.DFM_Size_TB))).sort((a, b) => a - b);
}
function validCaps(pureRows, dfmTb, maxPoints = 20) {
    const g = pureRows.filter((r) => r.DFM_Size_TB === dfmTb);
    if (g.length === 0)
        return [];
    const minPb = g[0].Min_Usable_PB;
    const inc = g[0].Capacity_Increment_PB;
    return Array.from({ length: maxPoints }, (_, i) => Number((minPb + i * inc).toFixed(2)));
}
function fbComp(pureRows, dfmTb, capacityPb) {
    const g = pureRows.filter((r) => r.DFM_Size_TB === dfmTb);
    if (g.length === 0)
        throw new Error("No FlashBlade rows for DFM track");
    const base = g[0];
    const minEc = base.Min_EC_Chassis || 1;
    const minEx = base.Min_EX_Chassis || 1;
    const minXfm = base.Min_XFMs || 2;
    const minPb = base.Min_Usable_PB || 0;
    const incPb = base.Capacity_Increment_PB || 0;
    const maxTotal = base.Max_Total_Chassis || 999;
    if (capacityPb < minPb - 1e-9)
        throw new Error("capacity too low");
    const nIncFloat = incPb > 0 ? (capacityPb - minPb) / incPb : 0;
    const nInc = Math.round(nIncFloat + 1e-9);
    if (Math.abs(nInc - nIncFloat) > 1e-6)
        throw new Error("invalid capacity point");
    let ecQty = minEc;
    let exQty = minEx + nInc;
    const xfmQty = Math.max(minXfm, 2);
    if (ecQty + exQty > maxTotal) {
        exQty = maxTotal - ecQty;
    }
    return { ecQty, exQty, xfmQty };
}
function compPower(pureRows, dfmTb, nameContains) {
    const needle = nameContains.toLowerCase();
    const g = pureRows.filter((r) => r.DFM_Size_TB === dfmTb && String(r.Model ?? "").toLowerCase().includes(needle));
    if (g.length === 0)
        throw new Error(`Missing power row for ${nameContains}`);
    const r = g[0];
    return {
        model: String(r.Model ?? ""),
        typicalW: r.Typical_W,
        idleW: r.Idle_W,
        rackUnits: r.Rack_Units,
        weightedW: (util) => r.Idle_W + util * (r.Typical_W - r.Idle_W),
    };
}
const kwhYear = (w) => (w * 8760) / 1000;
const btuPerHour = (w) => w * 3.412;
function fbPower(pureRows, dfmTb, capacityPb, util, pue, price, drr) {
    const { ecQty, exQty, xfmQty } = fbComp(pureRows, dfmTb, capacityPb);
    const ecP = compPower(pureRows, dfmTb, "EC chassis");
    const exP = compPower(pureRows, dfmTb, "EX chassis");
    const xfmP = compPower(pureRows, dfmTb, "XFM");
    const w = ecQty * ecP.weightedW(util) + exQty * exP.weightedW(util) + xfmQty * xfmP.weightedW(util);
    const kwhIt = kwhYear(w);
    const kwhWithPue = kwhIt * pue;
    const annualCost = kwhWithPue * price;
    const rackUnits = ecP.rackUnits != null && exP.rackUnits != null && xfmP.rackUnits != null
        ? ecQty * ecP.rackUnits + exQty * exP.rackUnits + xfmQty * xfmP.rackUnits
        : null;
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
        rackUnits,
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
function getExpansionShelf(netappRows) {
    // Auto-mode assumes DE460C expansion shelves for enumeration; update here if supported shelves expand.
    const expRows = netappRows.filter((r) => r.Component_Type === "Expansion_Shelf" && String(r.Model ?? "").includes("DE460C"));
    const exp = expRows.find((r) => String(r.Model).trim() === "DE460C 60-bay") ?? expRows[0];
    if (!exp)
        throw new Error("No DE460C expansion shelf found");
    return {
        model: String(exp.Model),
        typicalW: exp.Typical_W,
        idleW: exp.Idle_W,
        drives: toInt(exp.Drives_per_unit),
        rackUnits: exp.Rack_Units,
        weightedW: (u) => exp.Idle_W + u * (exp.Typical_W - exp.Idle_W),
    };
}
function getExpansionShelfByModel(netappRows, expansionModel) {
    const exp = netappRows.find((row) => row.Component_Type === "Expansion_Shelf" && String(row.Model ?? "") === expansionModel);
    if (!exp) {
        throw new Error(`Unknown expansion shelf model: ${expansionModel}`);
    }
    return {
        model: String(exp.Model),
        typicalW: exp.Typical_W,
        idleW: exp.Idle_W,
        drives: toInt(exp.Drives_per_unit),
        rackUnits: exp.Rack_Units,
        weightedW: (u) => exp.Idle_W + u * (exp.Typical_W - exp.Idle_W),
    };
}
function getControllerRows(netappRows) {
    return netappRows.filter((r) => r.Component_Type === "Controller_Shelf");
}
function getNetAppControllerModels(netappRows) {
    const models = getControllerRows(netappRows).map((r) => String(r.Model));
    return Array.from(new Set(models)).sort((a, b) => a.localeCompare(b));
}
function buildNetAppCandidate(netappRows, controllerModel, expansionModel, expansionQty, util, pue, price, overhead, extraWatts, drr, driveTb) {
    const exp = getExpansionShelfByModel(netappRows, expansionModel);
    const ctrl = getControllerRows(netappRows).find((row) => String(row.Model) === controllerModel);
    if (!ctrl) {
        throw new Error(`Unknown controller model: ${controllerModel}`);
    }
    const ctrlWeighted = (u) => ctrl.Idle_W + u * (ctrl.Typical_W - ctrl.Idle_W);
    const ctrlDrives = toInt(ctrl.Drives_per_unit);
    const totalDrives = ctrlDrives + expansionQty * exp.drives;
    const raw = totalDrives * driveTb;
    const usable = raw * (1 - overhead);
    const eff = usable * drr;
    const w = ctrlWeighted(util) + expansionQty * exp.weightedW(util) + extraWatts;
    const kwhPue = kwhYear(w) * pue;
    const annual = kwhPue * price;
    const rackUnits = ctrl.Rack_Units != null && exp.rackUnits != null ? ctrl.Rack_Units + expansionQty * exp.rackUnits : null;
    return {
        controllerModel,
        expansionModel: exp.model,
        controllerQty: 1,
        expansionQty,
        effectiveTb: eff,
        rackUnits,
        pctDiffFromTarget: 0,
        weightedW: w,
        kwhYearWithPue: kwhPue,
        annualEnergyCost: annual,
        wPerEffectiveTb: eff > 0 ? w / eff : null,
        dollarsPerEffectiveTbYear: eff > 0 ? annual / eff : null,
        kwhPerEffectiveTbYear: eff > 0 ? kwhPue / eff : null,
    };
}
function enumerateNetApp(netappRows, targetEffTb, util, pue, price, overhead, extraWatts, drr, driveTb, tolFrac = 0.1) {
    const exp = getExpansionShelf(netappRows);
    const ctrlRows = getControllerRows(netappRows);
    const out = [];
    for (const ctrl of ctrlRows) {
        const ctrlModel = String(ctrl.Model);
        const ctrlTypical = ctrl.Typical_W;
        const ctrlIdle = ctrl.Idle_W;
        const ctrlDrives = toInt(ctrl.Drives_per_unit);
        const ctrlWeighted = (u) => ctrlIdle + u * (ctrlTypical - ctrlIdle);
        for (let expQty = 0; expQty <= 10; expQty += 1) {
            const totalDrives = ctrlDrives + expQty * exp.drives;
            const raw = totalDrives * driveTb;
            const usable = raw * (1 - overhead);
            const eff = usable * drr;
            const w = ctrlWeighted(util) + expQty * exp.weightedW(util) + extraWatts;
            const kwhPue = kwhYear(w) * pue;
            const annual = kwhPue * price;
            const pct = targetEffTb > 0 ? ((eff - targetEffTb) / targetEffTb) * 100 : 0;
            const rackUnits = ctrl.Rack_Units != null && exp.rackUnits != null ? ctrl.Rack_Units + expQty * exp.rackUnits : null;
            if (Math.abs(pct) <= tolFrac * 100 + 1e-9) {
                out.push({
                    controllerModel: ctrlModel,
                    expansionModel: exp.model,
                    controllerQty: 1,
                    expansionQty: expQty,
                    effectiveTb: eff,
                    rackUnits,
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
        if (da !== db)
            return da - db;
        return a.annualEnergyCost - b.annualEnergyCost;
    });
    return out;
}
function enumerateVast(vastRows, targetEffTb, util, pue, price, overhead, extraWatts, drr, driveTb, tolFrac = 0.1) {
    if (vastRows.length === 0)
        return [];
    const controllerRows = vastRows.filter((r) => r.Component_Type === "Controller_Shelf" &&
        isValidNumber(r.Typical_W) &&
        isValidNumber(r.Idle_W) &&
        isValidNumber(r.Drives_per_unit));
    const expansionRows = vastRows.filter((r) => r.Component_Type === "Expansion_Shelf" &&
        isValidNumber(r.Typical_W) &&
        isValidNumber(r.Idle_W) &&
        isValidNumber(r.Drives_per_unit));
    if (controllerRows.length === 0 || expansionRows.length === 0)
        return [];
    const base = controllerRows[0];
    const expansion = expansionRows.find((row) => row.Auto_Default) ?? expansionRows[0];
    if (!expansion)
        return [];
    const baseWeighted = (u) => base.Idle_W + u * (base.Typical_W - base.Idle_W);
    const expWeighted = (u) => expansion.Idle_W + u * (expansion.Typical_W - expansion.Idle_W);
    const baseDrives = base.Drives_per_unit;
    const expDrives = expansion.Drives_per_unit;
    if (!isValidNumber(baseDrives) || !isValidNumber(expDrives))
        return [];
    const out = [];
    const maxExpansionQty = 200;
    const maxOverToleranceSteps = 4;
    let overToleranceSteps = 0;
    const toleranceUpper = targetEffTb > 0 ? targetEffTb * (1 + tolFrac) : Number.POSITIVE_INFINITY;
    for (let expQty = 0; expQty <= maxExpansionQty; expQty += 1) {
        const totalDrives = baseDrives + expQty * expDrives;
        const raw = totalDrives * driveTb;
        const usable = raw * (1 - overhead);
        const eff = usable * drr;
        const w = baseWeighted(util) + expQty * expWeighted(util) + extraWatts;
        const kwhPue = kwhYear(w) * pue;
        const annual = kwhPue * price;
        const pct = targetEffTb > 0 ? ((eff - targetEffTb) / targetEffTb) * 100 : 0;
        const rackUnits = isValidNumber(base.Rack_Units) && isValidNumber(expansion.Rack_Units)
            ? base.Rack_Units + expQty * expansion.Rack_Units
            : null;
        if (Math.abs(pct) <= tolFrac * 100 + 1e-9) {
            out.push({
                controllerModel: String(base.Model ?? ""),
                expansionModel: String(expansion.Model ?? ""),
                controllerQty: 1,
                expansionQty: expQty,
                effectiveTb: eff,
                rackUnits,
                pctDiffFromTarget: pct,
                weightedW: w,
                kwhYearWithPue: kwhPue,
                annualEnergyCost: annual,
                wPerEffectiveTb: eff > 0 ? w / eff : null,
                dollarsPerEffectiveTbYear: eff > 0 ? annual / eff : null,
                kwhPerEffectiveTbYear: eff > 0 ? kwhPue / eff : null,
            });
        }
        if (targetEffTb > 0) {
            if (eff > toleranceUpper) {
                overToleranceSteps += 1;
                if (overToleranceSteps >= maxOverToleranceSteps)
                    break;
            }
            else {
                overToleranceSteps = 0;
            }
        }
    }
    out.sort((a, b) => {
        const da = Math.abs(a.pctDiffFromTarget);
        const db = Math.abs(b.pctDiffFromTarget);
        if (da !== db)
            return da - db;
        return a.annualEnergyCost - b.annualEnergyCost;
    });
    return out;
}
