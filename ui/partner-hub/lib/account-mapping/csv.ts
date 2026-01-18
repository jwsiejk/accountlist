export type CsvValue = string | number | boolean | null | undefined;
export type CsvCell = CsvValue;
export type CsvRow = CsvCell[];
export type CsvRows = CsvRow[];

export const escapeCsvValue = (value: CsvValue): string => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '""');
  const shouldQuote = /[",\n\r]/.test(escaped);

  return shouldQuote ? `"${escaped}"` : escaped;
};

export const buildCsv = (headers: string[], rows: CsvValue[][]): string => {
  const headerRow = headers.map((header) => escapeCsvValue(header)).join(",");
  const dataRows = rows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(","));
  return [headerRow, ...dataRows].join("\n");
};

export const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
