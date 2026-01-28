"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadCsv = exports.buildCsv = exports.escapeCsvValue = void 0;
const escapeCsvValue = (value) => {
    if (value === null || value === undefined) {
        return "";
    }
    const stringValue = String(value);
    const escaped = stringValue.replace(/"/g, '""');
    const shouldQuote = /[",\n\r]/.test(escaped);
    return shouldQuote ? `"${escaped}"` : escaped;
};
exports.escapeCsvValue = escapeCsvValue;
const buildCsv = (headers, rows) => {
    const headerRow = headers.map((header) => (0, exports.escapeCsvValue)(header)).join(",");
    const dataRows = rows.map((row) => row.map((cell) => (0, exports.escapeCsvValue)(cell)).join(","));
    return [headerRow, ...dataRows].join("\n");
};
exports.buildCsv = buildCsv;
const downloadCsv = (filename, csv) => {
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
exports.downloadCsv = downloadCsv;
