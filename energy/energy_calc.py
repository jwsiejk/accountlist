
import csv
from dataclasses import dataclass
from typing import Dict, List

def read_csv(path: str) -> List[Dict]:
    rows = []
    with open(path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            rows.append(row)
    return rows

def to_float(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return float(default)

def to_int(v, default=0):
    try:
        return int(float(v))
    except Exception:
        return int(default)

@dataclass
class PowerModel:
    model: str
    typical_w: float
    idle_w: float
    def weighted(self, util): return self.idle_w + util*(self.typical_w - self.idle_w)

def load_pure(csv_path: str) -> List[Dict]:
    rows = read_csv(csv_path)
    for r in rows:
        r["DFM_Size_TB"] = to_int(r.get("DFM_Size_TB"))
        for c in ("Typical_W","Idle_W","Min_Usable_PB","Capacity_Increment_PB"):
            if c in r: r[c] = to_float(r.get(c))
        for c in ("Min_EC_Chassis","Min_EX_Chassis","Min_XFMs","Max_Total_Chassis"):
            if c in r: r[c] = to_int(r.get(c), 0)
    return rows

def load_netapp(csv_path: str) -> List[Dict]:
    rows = read_csv(csv_path)
    for r in rows:
        for c in ("Typical_W","Idle_W","Drives_per_unit","Rack_Units"):
            if c in r: r[c] = to_float(r.get(c))
    return rows

def fb_comp(pure_rows, dfm_tb:int, capacity_pb:float):
    g = [r for r in pure_rows if r["DFM_Size_TB"]==dfm_tb]
    if not g: raise ValueError("No FlashBlade rows for DFM track")
    base = g[0]
    min_ec = base.get("Min_EC_Chassis", 1) or 1
    min_ex = base.get("Min_EX_Chassis", 1) or 1
    min_xfm = base.get("Min_XFMs", 2) or 2
    min_pb = base.get("Min_Usable_PB", 0.0) or 0.0
    inc_pb = base.get("Capacity_Increment_PB", 0.0) or 0.0
    max_total = base.get("Max_Total_Chassis", 999) or 999
    if capacity_pb < min_pb - 1e-9: raise ValueError("capacity too low")
    n_inc_float = (capacity_pb - min_pb)/inc_pb if inc_pb>0 else 0
    n_inc = int(round(n_inc_float + 1e-9))
    if abs(n_inc - n_inc_float) > 1e-6: raise ValueError("invalid capacity point")
    ec_qty = min_ec; ex_qty = min_ex + n_inc; xfm_qty = max(min_xfm, 2)
    if ec_qty + ex_qty > max_total:
        ex_qty = max_total - ec_qty
    return ec_qty, ex_qty, xfm_qty

def comp_power(pure_rows, dfm_tb:int, name:str)->PowerModel:
    g = [r for r in pure_rows if r["DFM_Size_TB"]==dfm_tb and name.lower() in str(r.get("Model","")).lower()]
    if not g: raise ValueError(f"Missing power row for {name}")
    r = g[0]
    return PowerModel(str(r["Model"]), float(r["Typical_W"]), float(r["Idle_W"]))

def kwh_year(w): return w*8760/1000
def btu_h(w): return w*3.412

def valid_caps(pure_rows, dfm_tb:int, max_points:int=20)->List[float]:
    g = [r for r in pure_rows if r["DFM_Size_TB"]==dfm_tb]
    if not g: return []
    min_pb = float(g[0]["Min_Usable_PB"]); inc = float(g[0]["Capacity_Increment_PB"])
    return [round(min_pb + i*inc, 2) for i in range(max_points)]

def fb_power(pure_rows, dfm_tb:int, capacity_pb:float, util:float, pue:float, price:float, drr:float):
    ec_qty, ex_qty, xfm_qty = fb_comp(pure_rows, dfm_tb, capacity_pb)
    ec_p = comp_power(pure_rows, dfm_tb, "EC chassis")
    ex_p = comp_power(pure_rows, dfm_tb, "EX chassis")
    xfm_p = comp_power(pure_rows, dfm_tb, "XFM")
    w = ec_qty*ec_p.weighted(util) + ex_qty*ex_p.weighted(util) + xfm_qty*xfm_p.weighted(util)
    return {
        "dfm_tb": dfm_tb,
        "capacity_pb": capacity_pb,
        "ec_qty": ec_qty, "ex_qty": ex_qty, "xfm_qty": xfm_qty,
        "weighted_w": w,
        "kwh_it": kwh_year(w),
        "kwh_with_pue": kwh_year(w)*pue,
        "annual_cost": kwh_year(w)*pue*price,
        "btu_per_hour": btu_h(w),
        "effective_tb": capacity_pb*1000*drr,
        "components": {
            "EC": {"qty": ec_qty, "model": ec_p.model, "idle_w_per": ec_p.idle_w, "typical_w_per": ec_p.typical_w, "weighted_w_per": ec_p.weighted(util)},
            "EX": {"qty": ex_qty, "model": ex_p.model, "idle_w_per": ex_p.idle_w, "typical_w_per": ex_p.typical_w, "weighted_w_per": ex_p.weighted(util)},
            "XFM": {"qty": xfm_qty, "model": xfm_p.model, "idle_w_per": xfm_p.idle_w, "typical_w_per": xfm_p.typical_w, "weighted_w_per": xfm_p.weighted(util)}
        }
    }

def enumerate_netapp(netapp_rows, target_eff_tb:float, util:float, pue:float, price:float, overhead:float, drr:float, drive_tb:float, tol:float=0.10):
    allowed = {"E2860","E5760","E4060"}
    exp_rows = [r for r in netapp_rows if r.get("Component_Type")=="Expansion_Shelf" and "DE460C" in str(r.get("Model",""))]
    exp = None
    for r in exp_rows:
        if str(r.get("Model")).strip()=="DE460C 60-bay": exp=r; break
    if exp is None and exp_rows: exp = exp_rows[0]
    if exp is None: raise ValueError("No DE460C expansion shelf found")
    exp_pow = PowerModel(exp.get("Model"), float(exp.get("Typical_W")), float(exp.get("Idle_W")))
    exp_drives = int(float(exp.get("Drives_per_unit")))
    ctrl_rows = [r for r in netapp_rows if r.get("Component_Type")=="Controller_Shelf" and r.get("Model") in allowed]
    out = []
    for ctrl in ctrl_rows:
        ctrl_pow = PowerModel(ctrl.get("Model"), float(ctrl.get("Typical_W")), float(ctrl.get("Idle_W")))
        ctrl_drives = int(float(ctrl.get("Drives_per_unit")))
        for exp_qty in range(0, 11):
            total_drives = ctrl_drives + exp_qty*exp_drives
            raw = total_drives*drive_tb
            usable = raw*(1-overhead)
            eff = usable*drr
            w = ctrl_pow.weighted(util) + exp_qty*exp_pow.weighted(util)
            kwh_it = kwh_year(w); kwh_pue = kwh_it*pue; annual = kwh_pue*price
            pct = (eff - target_eff_tb)/target_eff_tb if target_eff_tb>0 else 0.0
            if abs(pct) <= tol + 1e-9:
                out.append({
                    "controller_model": ctrl.get("Model"),
                    "expansion_model": exp_pow.model,
                    "controller_qty": 1,
                    "expansion_qty": exp_qty,
                    "effective_tb": eff,
                    "pct_diff_from_target": pct*100,
                    "weighted_w": w,
                    "kwh_year_it": kwh_it,
                    "kwh_year_with_pue": kwh_pue,
                    "annual_energy_cost": annual,
                    "w_per_effective_tb": w/eff if eff>0 else None,
                    "dollars_per_effective_tb_year": annual/eff if eff>0 else None,
                    "kwh_per_effective_tb_year": kwh_pue/eff if eff>0 else None,
                    "details": {"total_drives": total_drives, "drive_size_tb": drive_tb, "overhead_frac": overhead, "drr": drr, "util_frac": util, "pue": pue, "price_per_kwh": price}
                })
    out.sort(key=lambda c: (abs(c["pct_diff_from_target"]), c["annual_energy_cost"]))
    return out


def compute_custom_netapp(netapp_rows, controller_model:str, controller_qty:int, expansion_model:str, expansion_qty:int,
                          drive_tb:float, util:float, pue:float, price:float, overhead:float, drr:float,
                          target_eff_tb:float=None):
    # Lookup power + drives per unit
    ctrl_row = next((r for r in netapp_rows if r.get("Component_Type")=="Controller_Shelf" and r.get("Model")==controller_model), None)
    exp_row = next((r for r in netapp_rows if r.get("Component_Type")=="Expansion_Shelf" and r.get("Model")==expansion_model), None)
    if ctrl_row is None: raise ValueError("Unknown controller model")
    if exp_row is None: raise ValueError("Unknown expansion model")

    ctrl_pow = PowerModel(ctrl_row.get("Model"), float(ctrl_row.get("Typical_W")), float(ctrl_row.get("Idle_W")))
    exp_pow  = PowerModel(exp_row.get("Model"),  float(exp_row.get("Typical_W")),  float(exp_row.get("Idle_W")))
    ctrl_drives = int(float(ctrl_row.get("Drives_per_unit"))) or 0
    exp_drives  = int(float(exp_row.get("Drives_per_unit"))) or 0

    total_drives = controller_qty*ctrl_drives + expansion_qty*exp_drives
    w = controller_qty*ctrl_pow.weighted(util) + expansion_qty*exp_pow.weighted(util)
    kwh_it = kwh_year(w)
    kwh_pue = kwh_it * pue
    annual = kwh_pue * price

    raw_tb = total_drives * float(drive_tb)
    usable_tb = raw_tb * (1.0 - float(overhead))
    eff = usable_tb * float(drr)
    out = {
        "controller_model": controller_model,
        "expansion_model": expansion_model,
        "controller_qty": controller_qty,
        "expansion_qty": expansion_qty,
        "effective_tb": eff,
        "weighted_w": w,
        "kwh_year_it": kwh_it,
        "kwh_year_with_pue": kwh_pue,
        "annual_energy_cost": annual,
        "w_per_effective_tb": w/eff if eff>0 else None,
        "dollars_per_effective_tb_year": annual/eff if eff>0 else None,
        "kwh_per_effective_tb_year": kwh_pue/eff if eff>0 else None,
        "details": {
            "total_drives": total_drives,
            "raw_tb": raw_tb,
            "usable_tb": usable_tb,
            "overhead": overhead,
            "drr": drr,
            "util_frac": util,
            "pue": pue,
            "price_per_kwh": price,
            "drives_per_controller": ctrl_drives,
            "drives_per_expansion": exp_drives,
            "drive_tb": drive_tb
        }
    }
    if target_eff_tb:
        out["pct_diff_from_target"] = ((eff - target_eff_tb)/target_eff_tb)*100.0
    return out
def build_assumptions(pure_rows, netapp_rows, fb, candidates, global_params):
    dfm_tb = fb["dfm_tb"]
    fb_sources = sorted({r.get("Source_URL") for r in pure_rows if r.get("DFM_Size_TB")==dfm_tb and r.get("Source_URL")})
    used_models = {c["controller_model"] for c in candidates} | {c["expansion_model"] for c in candidates}
    na_sources = sorted({r.get("Source_URL") for r in netapp_rows if r.get("Model") in used_models and r.get("Source_URL")})
    formulas = {
        "Weighted_W": "Idle_W + Util% × (Typical_W − Idle_W)",
        "kWh/yr (IT)": "Weighted_W × 8760 / 1000",
        "kWh/yr with PUE": "kWh_IT × PUE",
        "Annual $": "kWh_with_PUE × $/kWh",
        "BTU/h": "Weighted_W × 3.412",
        "FB Effective TB": "(Usable_PB × 1000) × DRR",
        "NetApp Raw TB": "(controller_drives + expansion_drives) × drive_size_TB",
        "NetApp Usable TB": "Raw × (1 − Overhead)",
        "NetApp Effective TB": "Usable × DRR",
        "Per-TB Metrics": "W / Effective_TB, $ / Effective_TB-yr, kWh / Effective_TB-yr"
    }
    return {
        "Global": global_params,
        "FlashBlade": {
            "DFM_track_TB": dfm_tb,
            "Usable_capacity_PB": fb["capacity_pb"],
            "Composition": fb["components"],
            "DRR": global_params["Pure_inputs"]["DRR"],
            "Totals": {
                "Weighted_W": fb["weighted_w"],
                "kWh_year_IT": fb["kwh_it"],
                "kWh_year_with_PUE": fb["kwh_with_pue"],
                "Annual_$": fb["annual_cost"],
                "BTU_per_hour": fb["btu_per_hour"],
                "Effective_TB": fb["effective_tb"]
            },
            "Sources": fb_sources
        },
        "NetApp": {
            "Auto_match": True,
            "Overhead_frac": global_params["NetApp_inputs"]["Overhead"],
            "DRR": global_params["NetApp_inputs"]["DRR"],
            "Drive_size_TB": global_params["NetApp_inputs"]["Drive_size_TB"],
            "Candidates_shown": candidates,
            "Sources": na_sources
        },
        "Formulas": formulas
    }
