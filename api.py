import os
import psycopg
from psycopg import errors
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

TABLE = os.getenv("ACCOUNTS_TABLE", "accounts")

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

# CORS: allow specific origins if provided, else *
allowed = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
CORS(app, origins=allowed if allowed else "*", supports_credentials=False)

# ---------- Web UI ----------
@app.get("/")
def home():
    return render_template("index.html")

@app.get("/account-search")
def account_search():
    return render_template("account_search.html")

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")), debug=True)
