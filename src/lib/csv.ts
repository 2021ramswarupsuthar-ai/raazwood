// CSV for admin exports (opens in Excel / Google Sheets). Cells that start with = + - @ are prefixed with a
// quote so a customer-typed value can never run as a spreadsheet formula (CSV injection).
export type Cell = string | number | boolean | null | undefined | Date;

export function csvCell(v: Cell): string {
  if (v === null || v === undefined) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  // BOM so Excel opens UTF-8 (₹, names) correctly
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
