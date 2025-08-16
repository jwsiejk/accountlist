import os
import psycopg2
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_db_conn():
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg2.connect(dsn)

app = Flask(__name__, static_folder='static', template_folder='templates')
# If you will serve the UI from the same Render service, CORS can be permissive or limited.
allowed = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
CORS(app, origins=allowed if allowed else "*", supports_credentials=False)

# ---------- Web UI ----------
@app.get('/')
def home():
    return render_template('index.html')

@app.get('/account-search')
def account_search():
    return render_template('account_search.html')

# ---------- API ----------
@app.get('/api/health')
def health():
    return jsonify(ok=True)

@app.get('/api/search')
def search():
    q = (request.args.get('q') or '').strip()
    if len(q) < 2:
        return jsonify(items=[])
    like = f"%{q}%"
    items = []
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT account_name
                FROM accounts
                WHERE account_name ILIKE %s
                ORDER BY account_name ASC
                LIMIT 100
                """, (like,)
            )
            items = [r[0] for r in cur.fetchall()]
    return jsonify(items=items)

@app.get('/api/get')
def get_one():
    name = (request.args.get('name') or '').strip()
    if not name:
        return jsonify(error='missing parameter: name'), 400
    row = None
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT account_name, account_owner, owner_email, manager, account_pam
                FROM accounts
                WHERE account_name = %s
                """, (name,)
            )
            row = cur.fetchone()
    if not row:
        return jsonify(found=False)
    account_name, owner, email, manager, pam = row
    # Normalize service account
    if (owner or '').strip().lower() == 'salesforce service account':
        owner = 'Not Assigned'
        email = ''
    return jsonify(found=True, name=account_name, owner=owner or '', email=email or '', manager=manager or '', pam=pam or '')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', '8080')), debug=True)
