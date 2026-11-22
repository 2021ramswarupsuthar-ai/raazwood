// Indian financial year runs 1 April to 31 March. Invoice numbers: RW/2026-27/000123
export function financialYear(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0 = Jan
  const start = m >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

export function formatInvoiceNo(prefix: string, d: Date, seq: number): string {
  return `${prefix}/${financialYear(d)}/${String(seq).padStart(6, '0')}`;
}
