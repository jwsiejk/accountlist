import os
from flask import Flask, request, redirect, send_from_directory

from energy import bp as energy_bp


# Extensions that should be cached "forever" (hashed/static assets)
IMMUTABLE_EXT = (
    ".js",
    ".mjs",
    ".css",
    ".map",
    ".json",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".ico",
    ".ttf",
    ".otf",
    ".woff",
    ".woff2",
    ".eot",
)

STATIC_ROOT = os.path.join(os.path.dirname(__file__), "app", "static")

app = Flask(__name__)


# --- Response headers (framing + caching) ---
@app.after_request
def _frame_headers(resp):
    # Allow same-origin embedding if you ever iframe parts of the site
    resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")

    # If CSP is present and has frame-ancestors but not 'self', add it.
    csp = resp.headers.get("Content-Security-Policy")
    if csp and "frame-ancestors" in csp and "'self'" not in csp:
        resp.headers["Content-Security-Policy"] = csp.replace(
            "frame-ancestors", "frame-ancestors 'self'"
        )
    return resp


@app.after_request
def _cache_headers(resp):
    """
    - HTML: no-store/no-cache
    - Immutable assets: long cache + immutable
    """
    try:
        ct = (resp.headers.get("Content-Type") or "").lower()
        path = request.path or ""

        is_html = "text/html" in ct or path.endswith("/") or path.endswith(".html")
        is_immutable = path.endswith(IMMUTABLE_EXT) or "/_next/" in path

        if is_html:
            resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            resp.headers["Pragma"] = "no-cache"
            resp.headers["Expires"] = "0"
        elif is_immutable:
            resp.headers.setdefault(
                "Cache-Control", "public, max-age=31536000, immutable"
            )
            try:
                if not resp.headers.get("ETag"):
                    resp.add_etag()
                    resp.make_conditional(request)
            except Exception:
                pass

        return resp
    except Exception:
        return resp


# --- Jinja filters used by /energy templates ---
def fmt0(x):
    try:
        return f"{float(x):,.0f}"
    except Exception:
        return str(x)


def fmt1(x):
    try:
        return f"{float(x):,.1f}"
    except Exception:
        return str(x)


def fmt2(x):
    try:
        return f"{float(x):,.2f}"
    except Exception:
        return str(x)


def fmt3(x):
    try:
        return f"{float(x):,.3f}"
    except Exception:
        return str(x)


app.jinja_env.filters["fmt0"] = fmt0
app.jinja_env.filters["fmt1"] = fmt1
app.jinja_env.filters["fmt2"] = fmt2
app.jinja_env.filters["fmt3"] = fmt3


# --- Routes ---
@app.get("/")
def root():
    return redirect("/partner-hub/", code=302)


# Partner Hub static routes
@app.route("/partner-hub")
def partner_hub_redirect():
    return redirect("/partner-hub/", code=301)


@app.route("/partner-hub/", defaults={"path": ""})
@app.route("/partner-hub/<path:path>")
def partner_hub(path: str):
    """
    Serves the exported Next.js site from: app/static/partner-hub
    """
    base_dir = os.path.join(STATIC_ROOT, "partner-hub")

    # If someone requests a directory (or empty), serve index.html
    if path == "" or path.endswith("/"):
        rel = (path + "index.html") if path else "index.html"
        return send_from_directory(base_dir, rel)

    # If they request a folder without trailing slash, try folder/index.html
    candidate_dir = os.path.join(base_dir, path)
    if os.path.isdir(candidate_dir):
        return send_from_directory(base_dir, os.path.join(path, "index.html"))

    # Otherwise serve the file as requested
    return send_from_directory(base_dir, path)


# Register Energy blueprint at /energy/*
app.register_blueprint(energy_bp, url_prefix="/energy")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")), debug=True)
