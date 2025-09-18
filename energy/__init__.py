
from flask import Blueprint, render_template, request, send_file, jsonify
import os, io, json, re
from dataclasses import asdict
from . import energy_calc as ec

bp = Blueprint("energy", __name__, template_folder="templates", static_folder=None)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
PURE_CSV = os.path.join(DATA_DIR, "pure_flashblade_e.csv")
NETAPP_CSV = os.path.join(DATA_DIR, "netapp_e_series.csv")

pure_rows = ec.load_pure(PURE_CSV)
netapp_rows = ec.load_netapp(NETAPP_CSV)

def fmt0(x):
    try: return f"{float(x):,.0f}"
    except: return str(x)
def fmt1(x):
    try: return f"{float(x):,.1f}"
    except: return str(x)
def fmt2(x):
    try: return f"{float(x):,.2f}"
    except: return str(x)
def fmt3(x):
    try: return f"{float(x):,.3f}"
    except: return str(x)

def round_floats(obj):
    if isinstance(obj, float):
        if abs(obj) >= 1000: return round(obj, 0)
        if abs(obj) >= 100: return round(obj, 1)
        if abs(obj) >= 10: return round(obj, 2)
        return round(obj, 6)
    if isinstance(obj, dict):
        return {k: round_floats(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [round_floats(v) for v in obj]
    return obj

# Jinja filters are registered on the parent Flask app; we format numbers inside templates via Python, so no custom filters here.

@bp.get("/")
def index():
    tracks = sorted({r["DFM_Size_TB"] for r in pure_rows})
    defaults = {"global_util": 50, "global_price": 0.12, "pure_util": 50, "pure_pue": 1.35, "pure_price": 0.12, "pure_drr": 2.0, "na_util": 50, "na_pue": 1.35, "na_price": 0.12, "na_overhead": 0.20, "na_drr": 1.3, "na_drive_size": 18, "global_util_pct": "50"}
    first_track = tracks[0] if tracks else 48
    valid_caps = ec.valid_caps(pure_rows, first_track, max_points=20)
    return render_template("energy/index.html", tracks=tracks, valid_caps=valid_caps, defaults=defaults)

@bp.get("/api/valid_caps")
def api_valid_caps():
    try:
        dfm_tb = int(request.args.get("dfm", "48"))
        caps = ec.valid_caps(pure_rows, dfm_tb, max_points=20)
        return jsonify({"ok": True, "dfm": dfm_tb, "capacities": caps})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

@bp.post("/results")
def results():
    dfm_tb = int(request.form.get("dfm_track", "48"))
    capacity_pb = float(request.form.get("capacity_pb"))
    global_util_pct_val = request.form.get("global_util_pct")
    pure_util = float(global_util_pct_val)/100.0 if global_util_pct_val is not None else float(request.form.get("pure_util", "50"))/100.0
    pure_pue = float(request.form.get("pure_pue"))
    global_price = request.form.get("global_price")
    pure_price = float(global_price) if global_price is not None else float(request.form.get("pure_price", "0.12"))
    pure_drr = float(request.form.get("pure_drr"))

    na_util = pure_util  # use global util if provided
    na_pue = float(request.form.get("na_pue"))
    na_price = pure_price  # use global price if provided
    na_overhead = float(request.form.get("na_overhead"))
    na_drr = float(request.form.get("na_drr"))
    na_drive_size = float(request.form.get("na_drive_size"))
    tol_pct = float(request.form.get("tol_pct", "10.0"))
    tol_frac = tol_pct / 100.0

    fb = ec.fb_power(pure_rows, dfm_tb, capacity_pb, util=pure_util, pue=pure_pue, price=pure_price, drr=pure_drr)
    cands = ec.enumerate_netapp(netapp_rows, target_eff_tb=fb['effective_tb'], util=na_util, pue=na_pue, price=na_price,
                                overhead=na_overhead, drr=na_drr, drive_tb=na_drive_size, tol=tol_frac)

    band_low = fb['effective_tb'] * (1.0 - tol_frac)
    band_high = fb['effective_tb'] * (1.0 + tol_frac)

    global_params = {
        "tolerance_percent": tol_pct,
        "hours_per_year": 8760,
        "Pure_inputs": {"Util%": pure_util*100, "PUE": pure_pue, "$/kWh": pure_price, "DRR": pure_drr},
        "NetApp_inputs": {"Util%": na_util*100, "PUE": na_pue, "$/kWh": na_price, "Overhead": na_overhead, "DRR": na_drr, "Drive_size_TB": na_drive_size}
    }
    assumptions = ec.build_assumptions(pure_rows, netapp_rows, fb, cands, global_params)

    candidates_json = json.dumps(cands)
    fb_json = json.dumps({
        "effective_tb": fb['effective_tb'],
        "weighted_w": fb['weighted_w'],
        "kwh_year_with_pue": fb['kwh_with_pue'],
        "annual_energy_cost": fb['annual_cost']
    })
    assumptions_json_js = json.dumps(assumptions)
    assumptions_pretty = json.dumps(round_floats(assumptions), indent=2, ensure_ascii=False)

    # Provide filters in template via Jinja env of parent app is not straightforward; we rely on preformatted in templates using pipes we already defined in parent app.
    best = cands[0] if len(cands)>0 else None

    return render_template("energy/results.html",
                           fb=type("FB", (), fb) if isinstance(fb, dict) else fb,
                           candidates=cands,
                           tol_pct=tol_pct,
                           band_low=band_low,
                           band_high=band_high,
                           assumptions_json=assumptions_json_js,
                           assumptions_json_js=assumptions_json_js,
                           assumptions_pretty=assumptions_pretty,
                           best=best,
                           candidates_json=candidates_json,
                           fb_json=fb_json,
                           ui_na_pue=na_pue,
                           ui_na_overhead=na_overhead,
                           ui_na_drr=na_drr,
                           ui_na_drive_size=na_drive_size,
                           ui_global_price=na_price,
                           ui_global_util_pct=na_util*100)

@bp.post("/assumptions.json")
def assumptions_download():
    data = request.get_json(force=True, silent=True) or {}
    assumptions = data.get("assumptions")
    if assumptions is None:
        return ("Bad Request: missing assumptions payload", 400)
    blob = json.dumps(round_floats(assumptions), indent=2, ensure_ascii=False).encode("utf-8")
    return send_file(io.BytesIO(blob), mimetype="application/json", as_attachment=True, download_name="assumptions.json")


def _parse_supported_sizes(row):
    val = (row or {}).get("Supported_Drive_TB")
    if not val or str(val).strip() == "" or str(val).lower() == "nan":
        return set()
    # Split by | , or whitespace, accept numbers like 18, 18.0
    parts = re.split(r"[|,/\s]+", str(val).strip())
    out = set()
    for p in parts:
        try:
            out.add(float(p))
        except Exception:
            continue
    return out

def get_drive_size_options(controller_model:str, expansion_model:str):
    # Gather sizes from matching rows (if present), else use fallback
    ctrl_row = next((r for r in netapp_rows if r.get("Component_Type")=="Controller_Shelf" and str(r.get("Model")).strip()==str(controller_model).strip()), None)
    exp_row = next((r for r in netapp_rows if r.get("Component_Type")=="Expansion_Shelf" and str(r.get("Model")).strip()==str(expansion_model).strip()), None)
    sizes_ctrl = _parse_supported_sizes(ctrl_row)
    sizes_exp = _parse_supported_sizes(exp_row)
    # If both exist, intersect; otherwise use whichever is non-empty
    if sizes_ctrl and sizes_exp:
        sizes = sorted(sizes_ctrl.intersection(sizes_exp))
    else:
        sizes = sorted(sizes_ctrl or sizes_exp)
    # Fallback list (kept in sync with CSV defaults)
    if not sizes:
        sizes = [8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 22.0]
    return sizes

@bp.get("/api/netapp/drive-options")
def netapp_drive_options():
    try:
        controller = request.args.get("controller", "E5760")
        expansion = request.args.get("expansion", "DE460C 60-bay")
        sizes = get_drive_size_options(controller, expansion)
        return jsonify({"ok": True, "drive_tb": sizes})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400



@bp.post("/api/netapp/custom")
def netapp_custom():
    data = request.get_json(force=True, silent=True) or {}
    ctrl_model = str(data.get("controller_model", "E5760")).strip()
    exp_model = str(data.get("expansion_model", "DE460C 60-bay")).strip()
    try:
        ctrl_qty = int(float(data.get("controller_qty", 1)))
        exp_qty = int(float(data.get("expansion_qty", 0)))
        drive_tb = float(data.get("drive_tb", 18.0))
        util = float(data.get("util", 0.50))
        pue = float(data.get("pue", 1.35))
        price = float(data.get("price", 0.12))
        overhead = float(data.get("overhead", 0.20))
        drr = float(data.get("drr", 1.3))
    except Exception as e:
        return jsonify({"ok": False, "error": f"Bad numeric input: {e}"}), 400

    # Lookup models
    ctrl_row = next((r for r in netapp_rows if r.get("Component_Type")=="Controller_Shelf" and str(r.get("Model")).strip()==ctrl_model), None)
    exp_row = next((r for r in netapp_rows if r.get("Component_Type")=="Expansion_Shelf" and str(r.get("Model")).strip()==exp_model), None)
    if ctrl_row is None:
        return jsonify({"ok": False, "error": f"Controller model not found: {ctrl_model}"}), 400
    if exp_row is None:
        return jsonify({"ok": False, "error": f"Expansion model not found: {exp_model}"}), 400

    # Power models
    ctrl_pow = ec.PowerModel(ctrl_row.get("Model"), float(ctrl_row.get("Typical_W")), float(ctrl_row.get("Idle_W")))
    exp_pow = ec.PowerModel(exp_row.get("Model"), float(exp_row.get("Typical_W")), float(exp_row.get("Idle_W")))
    drives_ctrl = int(float(ctrl_row.get("Drives_per_unit") or 0))
    drives_exp = int(float(exp_row.get("Drives_per_unit") or 0))

    weighted_w = ctrl_qty*ctrl_pow.weighted(util) + exp_qty*exp_pow.weighted(util)
    kwh_it = ec.kwh_year(weighted_w)
    kwh_with_pue = kwh_it * pue
    annual_cost = kwh_with_pue * price

    total_drives = ctrl_qty*drives_ctrl + exp_qty*drives_exp
    raw_tb = total_drives * drive_tb
    usable_tb = raw_tb * (1.0 - overhead)
    effective_tb = usable_tb * drr

    # Compose response aligned with candidates schema
    def safe_div(a,b): 
        try: 
            return a/b if b else 0.0
        except Exception: 
            return 0.0

    candidate = {
        "controller_model": ctrl_model,
        "expansion_model": exp_model,
        "controller_qty": ctrl_qty,
        "expansion_qty": exp_qty,
        "weighted_w": weighted_w,
        "kwh_year_with_pue": kwh_with_pue,
        "annual_energy_cost": annual_cost,
        "effective_tb": effective_tb,
        "w_per_effective_tb": safe_div(weighted_w, effective_tb),
        "dollars_per_effective_tb_year": safe_div(annual_cost, effective_tb),
        "kwh_per_effective_tb_year": safe_div(kwh_with_pue, effective_tb),
        "details": {
            "total_drives": total_drives,
            "raw_tb": raw_tb,
            "usable_tb": usable_tb,
            "overhead": overhead,
            "drr": drr,
            "util_frac": util,
            "pue": pue,
            "price_per_kwh": price,
            "drives_per_controller": drives_ctrl,
            "drives_per_expansion": drives_exp,
            "drive_tb": drive_tb
        }
    }
    return jsonify({"ok": True, "candidate": candidate})
