import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const dataDir = path.join(repoRoot, "energy", "data");
const reportPath = path.join(dataDir, "vendor_update_report.json");

const csvFiles = ["pure_flashblade_e.csv", "netapp_e_series.csv"];
const jsonNamePattern = /(compat|catalog)/i;

const UA_PRIMARY =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const UA_FALLBACK =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
const DEFAULT_HEADERS = {
  "User-Agent": UA_PRIMARY,
  Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.length === 1 && row[0] === "" && rows.length > 0) return;
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      pushField();
      continue;
    }

    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }

    if (ch === "\r") {
      continue;
    }

    field += ch;
  }

  pushField();
  pushRow();

  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => String(cell ?? "").trim() !== ""))
    .map((r) => {
      const obj = {};
      header.forEach((key, idx) => {
        obj[key] = (r[idx] ?? "").trim();
      });
      return obj;
    });
};

const collectUrlsFromJson = (value, urls) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectUrlsFromJson(item, urls));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, val] of Object.entries(value)) {
      if (/source[_-]?url/i.test(key) && typeof val === "string") {
        urls.add(val);
      } else {
        collectUrlsFromJson(val, urls);
      }
    }
  }
};

const readJsonFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await readJsonFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".json") && jsonNamePattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
};

const readPreviousReport = async () => {
  try {
    const text = await fs.readFile(reportPath, "utf8");
    const data = JSON.parse(text);
    const entries = [
      ...(data.ok ?? []),
      ...(data.redirected ?? []),
      ...(data.changed ?? []),
      ...(data.missing ?? []),
      ...(data.error ?? []),
    ];
    const map = new Map();
    entries.forEach((entry) => {
      if (entry?.url) map.set(entry.url, entry);
    });
    return map;
  } catch (err) {
    if (err && err.code === "ENOENT") return new Map();
    throw err;
  }
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const headers = { ...DEFAULT_HEADERS, ...(options.headers ?? {}) };
  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      redirect: "follow",
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
};

const hashBuffer = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const checkUrl = async (url) => {
  let headRes;
  try {
    headRes = await fetchWithTimeout(url, { method: "HEAD" });
  } catch (err) {
    return { url, error: `HEAD failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  let getRes;
  let bodyBuffer = null;
  if (headRes.ok || headRes.status === 405 || headRes.status === 403 || headRes.status === 429) {
    try {
      getRes = await fetchWithTimeout(url, { method: "GET" });
      if (getRes.status === 403 || getRes.status === 429) {
        getRes = await fetchWithTimeout(url, {
          method: "GET",
          headers: { "User-Agent": UA_FALLBACK },
        });
      }
      bodyBuffer = Buffer.from(await getRes.arrayBuffer());
    } catch (err) {
      return {
        url,
        status: headRes.status,
        finalUrl: headRes.url ?? url,
        etag: headRes.headers.get("etag"),
        lastModified: headRes.headers.get("last-modified"),
        error: `GET failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  const res = getRes ?? headRes;
  if (res.status === 403 || res.status === 429) {
    return {
      url,
      status: res.status,
      finalUrl: res.url ?? url,
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
      error: `Blocked by vendor site (${res.status}). Link may still be valid in a browser.`,
    };
  }
  return {
    url,
    status: res.status,
    finalUrl: res.url ?? url,
    etag: res.headers.get("etag"),
    lastModified: res.headers.get("last-modified"),
    contentHash: bodyBuffer ? hashBuffer(bodyBuffer) : null,
  };
};

const categorize = (entry, previous) => {
  if (entry.error) return "error";
  if (entry.status === 404 || entry.status === 410) return "missing";
  if (!entry.status || entry.status >= 400) return "error";
  const changed =
    previous &&
    ((previous.contentHash && entry.contentHash && previous.contentHash !== entry.contentHash) ||
      (previous.etag && entry.etag && previous.etag !== entry.etag) ||
      (previous.lastModified && entry.lastModified && previous.lastModified !== entry.lastModified));
  if (changed) return "changed";
  if (entry.finalUrl && entry.finalUrl !== entry.url) return "redirected";
  return "ok";
};

const main = async () => {
  const urls = new Set();

  for (const file of csvFiles) {
    const text = await fs.readFile(path.join(dataDir, file), "utf8");
    const rows = parseCsv(text);
    rows.forEach((row) => {
      const value = row.Source_URL;
      if (typeof value === "string" && value.trim()) {
        urls.add(value.trim());
      }
    });
  }

  const jsonFiles = await readJsonFiles(dataDir);
  for (const file of jsonFiles) {
    const text = await fs.readFile(file, "utf8");
    const data = JSON.parse(text);
    collectUrlsFromJson(data, urls);
  }

  const previousReport = await readPreviousReport();
  const report = {
    checkedAtISO: new Date().toISOString(),
    ok: [],
    redirected: [],
    changed: [],
    missing: [],
    error: [],
  };

  for (const url of urls) {
    const entry = await checkUrl(url);
    const previous = previousReport.get(url);
    if (previous) {
      entry.previous = {
        status: previous.status,
        finalUrl: previous.finalUrl,
        etag: previous.etag,
        lastModified: previous.lastModified,
        contentHash: previous.contentHash,
      };
    }
    const bucket = categorize(entry, previous);
    report[bucket].push(entry);
  }

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${reportPath}`);
};

main().catch((err) => {
  console.error("Failed to check vendor sources:", err);
  process.exitCode = 1;
});
