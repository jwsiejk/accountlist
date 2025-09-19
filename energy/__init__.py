
from flask import Blueprint, render_template, request, send_file, jsonify
import os, io, json
from dataclasses import asdict
from . import energy_calc as ec

bp = Blueprint("energy", __name__, template_folder="templates", static_folder=None)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
PURE_CSV = os.path.join(DATA_DIR, "pure_flashblade_e.csv")
NETAPP_CSV = os.path.join(DATA_DIR, "netapp_e_series.csv")

pure_rows = ec.load_pure(PURE_CSV)
netapp_rows = ec.load_netapp(NETAPP_CSV)

def _parse_allowed_sizes(rows, model_name):
    sizes = []
    col = None
    try:
        if rows and isinstance(rows[0], dict) and 'Allowed_Drive_TB' in rows[0]:
            col = 'Allowed_Drive_TB'
    except Exception:
        pass
    if col:
        for r in rows:
            if r.get('Model') == model_name and r.get(col):
                for tok in str(r[col]).replace(';', ',').split(','):
                    tok = tok.strip()
                    if not tok: continue
                    try: sizes.append(float(tok))
                    except: pass
    return sorted(sorted(set(sizes)))

def get_drive_sizes(controller_model: str, expansion_model: str):
    controller_model = (controller_model or '').strip()
    expansion_model = (expansion_model or '').strip()
    sizes = _parse_allowed_sizes(netapp_rows, expansion_model) or _parse_allowed_sizes(netapp_rows, controller_model)
    if sizes: return sizes
    def drives_per(model):
        for r in netapp_rows:
            if r.get('Model') == model:
                try: return int(r.get('Drives_per_unit') or 0)
                except: return 0
        return 0
    dp = drives_per(expansion_model) or drives_per(controller_model)
    if dp >= 60 or '60-bay' in expansion_model or '60' in controller_model:
        return [8,10,12,14,16,18,20,22,24]
    if dp == 24 or '24-bay' in expansion_model:
        return [0.8,1.2,1.6,1.8,3.8,7.6,15.3]
    return [8,12,16,18,20]

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
    defaults = {"pure_util": 50, "pure_pue": 1.35, "pure_price": 0.12, "pure_drr": 2.0, "na_util": 50, "na_pue": 1.35, "na_price": 0.12, "na_overhead": 0.20, "na_drr": 1.3, "na_drive_size": 18, "global_util_pct": 50, "global_price": 0.12}
    first_track = tracks[0] if tracks else 48
    valid_caps = ec.valid_caps(pure_rows, first_track, max_points=20)
    return render_template("energy/index.html", tracks=tracks, valid_caps=valid_caps, defaults=defaults)


@bp.get("/api/netapp/drive_sizes")
def api_netapp_drive_sizes():
    controller = request.args.get("controller_model", "").strip()
    expansion = request.args.get("expansion_model", "").strip()
    try:
        sizes = get_drive_sizes(controller, expansion)
        return jsonify({"ok": True, "sizes_tb": sizes})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

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
    global_util_pct = float(request.form.get("global_util_pct", request.form.get("pure_util", request.form.get("na_util", 50))))/100.0
global_price = float(request.form.get("global_price", request.form.get("pure_price", request.form.get("na_price", 0.12))))
pure_util = global_util_pct
pure_pue = float(request.form.get("pure_pue"))
pure_price = global_price
pure_drr = float(request.form.get("pure_drr"))

na_util = global_util_pct
na_pue = float(request.form.get("na_pue"))
na_price = global_price
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
                           fb_json=fb_json)

@bp.post("/assumptions.json")
def assumptions_download():
    data = request.get_json(force=True, silent=True) or {}
    assumptions = data.get("assumptions")
    if assumptions is None:
        return ("Bad Request: missing assumptions payload", 400)
    blob = json.dumps(round_floats(assumptions), indent=2, ensure_ascii=False).encode("utf-8")
    return send_file(io.BytesIO(blob), mimetype="application/json", as_attachment=True, download_name="assumptions.json")

@bp.post("/api/netapp/custom")
def netapp_custom():
    data = request.get_json(force=True, silent=True) or {}
    ctrl = data.get('controller_model')
    exp = data.get('expansion_model')
    ctrl_q = int(data.get('controller_qty', 1))
    exp_q = int(data.get('expansion_qty', 0))
    drive_tb = float(data.get('drive_tb', 18))
    util = float(data.get('util', 0.5))
    pue = float(data.get('pue', 1.35))
    price = float(data.get('price', 0.12))
    overhead = float(data.get('overhead', 0.2))
    drr = float(data.get('drr', 1.3))
    cand = ec.compute_custom_netapp(netapp_rows, ctrl, ctrl_q, exp, exp_q, drive_tb, util, pue, price, overhead, drr)
    return jsonify({"ok": True, "candidate": cand})
