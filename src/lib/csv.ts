function escapeCsv(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.map(escapeCsv).join(",");
  const body = rows.map((row) => keys.map((k) => escapeCsv(row[k])).join(",")).join("\n");
  return header + "\n" + body;
}

export function csvResponse(rows: Record<string, unknown>[], filename: string): Response {
  const bom = "﻿";
  const csv = bom + toCsv(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
