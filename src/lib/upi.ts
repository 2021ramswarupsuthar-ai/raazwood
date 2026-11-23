// Manual UPI fallback (README §6 option B): customer pays the exact amount to our VPA and types the UTR.
export const isValidVpa = (vpa: string): boolean => /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/.test(vpa);

/** UTR / UPI reference: 12 digits for most UPI apps; allow 10-22 letters/digits for banks that differ. */
export const normalizeUtr = (s: string): string => s.replace(/[\s-]/g, '').toUpperCase();
export const isValidUtr = (s: string): boolean => /^[A-Z0-9]{10,22}$/.test(s);

export function upiPayLink(o: { vpa: string; payeeName: string; amountPaise: number; note: string; ref: string }): string {
  const p = new URLSearchParams({
    pa: o.vpa,
    pn: o.payeeName,
    am: (o.amountPaise / 100).toFixed(2),
    cu: 'INR',
    tn: o.note.slice(0, 50),
    tr: o.ref.slice(0, 35),
  });
  return `upi://pay?${p.toString().replace(/\+/g, '%20')}`;
}
