export type CsvRow = Record<string, string | number | null>;

// Minimal RFC4180-ish CSV parser with quote handling.
// - Supports quoted fields with escaped quotes ("").
// - Supports commas and newlines inside quoted fields.
export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    // Avoid pushing a trailing empty row.
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

    if (ch === ',') {
      pushField();
      continue;
    }

    if (ch === '\n') {
      pushField();
      pushRow();
      continue;
    }

    if (ch === '\r') {
      // Ignore CR (handled by LF).
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
      const obj: CsvRow = {};
      header.forEach((key, idx) => {
        obj[key] = (r[idx] ?? "").trim();
      });
      return obj;
    });
}
