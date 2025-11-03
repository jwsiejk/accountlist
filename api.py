import os
import psycopg
from psycopg import errors
from flask import Flask, request, jsonify, render_template, redirect, url_for, current_app, send_from_directory
import json
from energy import bp as energy_bp
from flask_cors import CORS

TABLE = os.getenv("ACCOUNTS_TABLE", "accounts")
STATIC_ROOT = os.path.join(os.path.dirname(__file__), "app", "static")

def _sanitize_dsn(raw: str) -> str:
    """Strip common copy/paste mistakes like `psql 'postgresql://...` and wrapping quotes."""
    dsn = (raw or "").strip()
    if dsn.lower().startswith("psql "):
        dsn = dsn.split(" ", 1)[1].strip()
    if (dsn.startswith("'") and dsn.endswith("'")) or (dsn.startswith('"') and dsn.endswith('"')):
        dsn = dsn[1:-1]
    return dsn

def get_db_conn():
    raw = os.getenv("DATABASE_URL")
    dsn = _sanitize_dsn(raw)
    if not dsn:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg.connect(dsn)

app = Flask(__name__, static_folder="static", template_folder="templates")

# Ensure pages can be embedded in same-origin iframes (e.g., Partner Hub)
@app.after_request
def _frame_headers(resp):
    # Allow same-origin embedding for Partner Hub iframes
    resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    # For older browsers, keep CSP frame-ancestors loose enough for same-origin
    csp = resp.headers.get("Content-Security-Policy")
    if csp and "frame-ancestors" in csp and "self" not in csp:
        resp.headers["Content-Security-Policy"] = csp.replace(
            "frame-ancestors", "frame-ancestors 'self'"
        )
    return resp

# Partner Hub static routes
@app.route("/partner-hub")
def partner_hub_redirect():
    return redirect("/partner-hub/", code=301)

@app.route("/partner-hub/", defaults={"path": ""})
@app.route("/partner-hub/<path:path>")
def partner_hub(path: str):
    base_dir = os.path.join(STATIC_ROOT, "partner-hub")
    # Directory requests → index.html
    if path == "" or path.endswith("/"):
        path = (path + "index.html") if path else "index.html"
    full_path = os.path.join(base_dir, path)
    if not os.path.isfile(full_path):
        return ("Not Found", 404)
    return send_from_directory(base_dir, path)

@app.route("/partner-hub/_debug_exists")
def partner_hub_debug():
    base_dir = os.path.join(STATIC_ROOT, "partner-hub")
    index_path = os.path.join(base_dir, "index.html")
    return {"base_dir": base_dir, "index_exists": os.path.isfile(index_path)}

# Register Energy blueprint
app.register_blueprint(energy_bp, url_prefix='/energy')

# CORS: allow specific origins if provided, else *
allowed = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
CORS(app, origins=allowed if allowed else "*", supports_credentials=False)

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
app.jinja_env.filters['fmt0']=fmt0
app.jinja_env.filters['fmt1']=fmt1
app.jinja_env.filters['fmt2']=fmt2
app.jinja_env.filters['fmt3']=fmt3


# ---------- Web UI ----------
@app.get("/")
def home():
    # Build energy link safely even if blueprint isn't registered yet
    try:
        energy_url = url_for('energy.index') if 'energy.index' in app.view_functions else '/energy/'
    except Exception:
        energy_url = '/energy/'
    return render_template("index.html", energy_url=energy_url)

@app.get("/account-search")
def account_search():
    return render_template("account_search.html")


@app.get("/alliances/pipeline")
def alliances_pipeline():
    return (
        "<h1>Pipeline Report</h1><p>TODO: Wire real report here.</p>",
        200,
        {"Content-Type": "text/html; charset=utf-8"},
    )


@app.get("/alliances/assets")
def alliances_assets():
    return (
        "<h1>Asset Report</h1><p>TODO: Wire real report here (restricted).</p>",
        200,
        {"Content-Type": "text/html; charset=utf-8"},
    )

@app.get('/energy')
def energy_root():
    return redirect(url_for('energy.index'))

# ---------- API ----------
@app.get("/api/health")
def health():
    """Deep health: confirms DB connectivity and counts rows in the target table."""
    out = {"ok": False, "table": TABLE}
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
            with conn.cursor() as cur:
                cur.execute(f"SELECT COUNT(*) FROM {TABLE}")
                out["rows"] = cur.fetchone()[0]
        out["ok"] = True
        out["db"] = "ok"
    except Exception as e:
        app.logger.exception("health failed")
        out["error"] = str(e)
    return jsonify(out)

@app.get("/api/search")
def search():
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify(items=[])
    like = f"%{q}%"
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT account_name
                    FROM {TABLE}
                    WHERE account_name ILIKE %s
                    ORDER BY account_name ASC
                    LIMIT 100
                    """,
                    (like,),
                )
                items = [r[0] for r in cur.fetchall()]
        return jsonify(items=items)
    except Exception:
        app.logger.exception("search failed")
        return jsonify(error="server_error"), 500

@app.get("/api/get")
def get_one():
    name = (request.args.get("name") or "").strip()
    if not name:
        return jsonify(error="missing parameter: name"), 400
    try:
        row = None
        last_err = None
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                # Try your common column layouts without altering schema
                queries = [
                    f"SELECT account_name, owner, owner_email, manager, pam "
                    f"FROM {TABLE} WHERE account_name = %s LIMIT 1",
                    f"SELECT account_name, account_owner, owner_email, manager, account_pam "
                    f"FROM {TABLE} WHERE account_name = %s LIMIT 1",
                    f"SELECT account_name, pure_ae, pure_ae_email, pure_rsd, pure_pam "
                    f"FROM {TABLE} WHERE account_name = %s LIMIT 1",
                ]
                for sqlq in queries:
                    try:
                        cur.execute(sqlq, (name,))
                        row = cur.fetchone()
                        if row is not None:
                            break
                    except errors.UndefinedColumn as e:
                        last_err = e
                        conn.rollback()
                        continue
        if row is None:
            if last_err:
                app.logger.warning("get_one: compatible columns not found on table '%s': %s", TABLE, last_err)
            return jsonify(found=False)

        account_name, owner, email, manager, pam = row

        # Normalize service account (server-side)
        if (owner or "").strip().lower() == "salesforce service account":
            owner = "Not Assigned"
            email = ""

        return jsonify(
            found=True,
            name=account_name or "",
            owner=owner or "",
            email=email or "",
            manager=manager or "",
            pam=pam or "",
        )
    except Exception:
        app.logger.exception("get_one failed")
        return jsonify(error="server_error"), 500

# ---- Energy Scenarios (DB-backed) ----
@app.post("/energy/api/scenarios")
def save_energy_scenario():
    try:
        body = request.get_json(force=True, silent=True) or {}
        name = (body.get("name") or "Scenario").strip()
        email = (body.get("email") or "").strip()
        payload = body.get("payload") or {}
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS energy_scenarios(
                        id BIGSERIAL PRIMARY KEY,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        name TEXT NOT NULL,
                        email TEXT,
                        payload JSONB NOT NULL
                    )
                """)
                cur.execute("INSERT INTO energy_scenarios(name,email,payload) VALUES (%s,%s,%s) RETURNING id, created_at", (name, email, json.dumps(payload)))
                rid, created_at = cur.fetchone()
            conn.commit()
        return jsonify(ok=True, id=rid, created_at=str(created_at))
    except Exception as e:
        current_app.logger.exception("save_energy_scenario failed")
        return jsonify(ok=False, error=str(e)), 500

@app.get("/energy/api/scenarios")
def list_energy_scenarios():
    try:
        limit = int(request.args.get("limit","25"))
        email = (request.args.get("email") or "").strip()
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                if email:
                    cur.execute("SELECT id, created_at, name FROM energy_scenarios WHERE email=%s ORDER BY id DESC LIMIT %s", (email, limit))
                else:
                    cur.execute("SELECT id, created_at, name FROM energy_scenarios ORDER BY id DESC LIMIT %s", (limit,))
                rows = [{"id": r[0], "created_at": r[1].isoformat(), "name": r[2]} for r in cur.fetchall()]
        return jsonify(ok=True, items=rows)
    except Exception as e:
        current_app.logger.exception("list_energy_scenarios failed")
        return jsonify(ok=False, error=str(e)), 500

@app.get("/energy/api/scenarios/<int:sid>")
def get_energy_scenario(sid: int):
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT payload, name, created_at FROM energy_scenarios WHERE id=%s", (sid,))
                row = cur.fetchone()
        if not row:
            return jsonify(ok=False, error="not_found"), 404
        payload, name, created_at = row
        return jsonify(ok=True, id=sid, name=name, created_at=str(created_at), payload=payload)
    except Exception as e:
        current_app.logger.exception("get_energy_scenario failed")
        return jsonify(ok=False, error=str(e)), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")), debug=True)
