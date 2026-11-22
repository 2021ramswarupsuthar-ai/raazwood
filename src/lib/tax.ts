// GST on GST-INCLUSIVE prices. Prices shown to customers include GST.
// Intra-state supply (delivery state == seller state): CGST + SGST. Inter-state: IGST.
export type TaxType = 'INTRA' | 'INTER';

export type TaxSplit = {
  gross: number; // inclusive amount (paise)
  taxable: number; // value before tax (paise)
  tax: number; // total tax (paise)
  cgst: number;
  sgst: number;
  igst: number;
};

export function taxTypeFor(sellerStateCode: string, deliveryStateCode: string): TaxType {
  return sellerStateCode.toUpperCase() === deliveryStateCode.toUpperCase() ? 'INTRA' : 'INTER';
}

export function splitInclusive(grossPaise: number, ratePercent: number, type: TaxType): TaxSplit {
  if (!Number.isInteger(grossPaise) || grossPaise < 0) throw new Error('gross must be a non-negative integer (paise)');
  if (ratePercent < 0 || ratePercent > 100) throw new Error('invalid GST rate');
  const taxable = Math.round((grossPaise * 100) / (100 + ratePercent));
  const tax = grossPaise - taxable;
  if (type === 'INTER') return { gross: grossPaise, taxable, tax, cgst: 0, sgst: 0, igst: tax };
  const cgst = Math.floor(tax / 2);
  return { gross: grossPaise, taxable, tax, cgst, sgst: tax - cgst, igst: 0 };
}

export function sumSplits(splits: TaxSplit[]): TaxSplit {
  return splits.reduce(
    (a, s) => ({
      gross: a.gross + s.gross,
      taxable: a.taxable + s.taxable,
      tax: a.tax + s.tax,
      cgst: a.cgst + s.cgst,
      sgst: a.sgst + s.sgst,
      igst: a.igst + s.igst,
    }),
    { gross: 0, taxable: 0, tax: 0, cgst: 0, sgst: 0, igst: 0 },
  );
}
