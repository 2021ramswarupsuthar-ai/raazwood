import { splitInclusive, sumSplits, taxTypeFor, type TaxSplit, type TaxType } from './tax.ts';

export type PriceLineInput = {
  variantId: string;
  pricePaise: number; // GST-inclusive unit price
  qty: number;
  gstRate: number;
  shippingPaise: number; // per unit
};

export type PricedLine = PriceLineInput & { lineTotal: number; tax: TaxSplit };

export type Totals = {
  lines: PricedLine[];
  goodsTotal: number; // inclusive of GST
  shipping: number; // inclusive of GST
  total: number;
  taxType: TaxType;
  tax: TaxSplit; // goods + shipping
};

export function calcTotals(opts: {
  lines: PriceLineInput[];
  sellerStateCode: string;
  deliveryStateCode: string;
  freeShippingAbovePaise?: number;
}): Totals {
  const { lines, sellerStateCode, deliveryStateCode } = opts;
  if (lines.length === 0) throw new Error('cart is empty');
  const taxType = taxTypeFor(sellerStateCode, deliveryStateCode);

  const priced: PricedLine[] = lines.map((l) => {
    if (!Number.isInteger(l.qty) || l.qty < 1) throw new Error('invalid quantity');
    const lineTotal = l.pricePaise * l.qty;
    return { ...l, lineTotal, tax: splitInclusive(lineTotal, l.gstRate, taxType) };
  });

  const goodsTotal = priced.reduce((s, l) => s + l.lineTotal, 0);
  let shipping = priced.reduce((s, l) => s + l.shippingPaise * l.qty, 0);
  const freeAbove = opts.freeShippingAbovePaise ?? 0;
  if (freeAbove > 0 && goodsTotal >= freeAbove) shipping = 0;

  // Shipping is treated as part of the same supply and taxed at the highest rate in the cart.
  const shipRate = Math.max(...priced.map((l) => l.gstRate));
  const shipSplit = splitInclusive(shipping, shipRate, taxType);

  return {
    lines: priced,
    goodsTotal,
    shipping,
    total: goodsTotal + shipping,
    taxType,
    tax: sumSplits([...priced.map((l) => l.tax), shipSplit]),
  };
}
