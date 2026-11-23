import { splitInclusive, sumSplits, taxTypeFor, type TaxSplit, type TaxType } from './tax.ts';
import { allocateDiscount } from './coupon.ts';

export type PriceLineInput = {
  variantId: string;
  pricePaise: number; // GST-inclusive unit price
  qty: number;
  gstRate: number;
  shippingPaise: number; // per unit
};

export type PricedLine = PriceLineInput & {
  lineTotal: number; // before discount
  discount: number; // this line's share of the coupon discount
  tax: TaxSplit; // on (lineTotal - discount)
};

export type Totals = {
  lines: PricedLine[];
  goodsTotal: number; // inclusive of GST, before discount
  discount: number;
  shipping: number; // inclusive of GST
  total: number; // goodsTotal - discount + shipping
  taxType: TaxType;
  tax: TaxSplit; // goods (after discount) + shipping
};

export function calcTotals(opts: {
  lines: PriceLineInput[];
  sellerStateCode: string;
  deliveryStateCode: string;
  freeShippingAbovePaise?: number;
  discountPaise?: number; // order-level coupon discount, already validated
  extraShippingPaise?: number; // per-order surcharge from the delivery zone
}): Totals {
  const { lines, sellerStateCode, deliveryStateCode } = opts;
  if (lines.length === 0) throw new Error('cart is empty');
  const taxType = taxTypeFor(sellerStateCode, deliveryStateCode);

  const totalsBefore = lines.map((l) => {
    if (!Number.isInteger(l.qty) || l.qty < 1) throw new Error('invalid quantity');
    return l.pricePaise * l.qty;
  });
  const goodsTotal = totalsBefore.reduce((s, v) => s + v, 0);
  const discount = Math.max(0, Math.min(opts.discountPaise ?? 0, goodsTotal));
  const shares = allocateDiscount(totalsBefore, discount);

  const priced: PricedLine[] = lines.map((l, i) => ({
    ...l,
    lineTotal: totalsBefore[i],
    discount: shares[i],
    tax: splitInclusive(totalsBefore[i] - shares[i], l.gstRate, taxType),
  }));

  let shipping = priced.reduce((s, l) => s + l.shippingPaise * l.qty, 0) + Math.max(0, opts.extraShippingPaise ?? 0);
  const freeAbove = opts.freeShippingAbovePaise ?? 0;
  if (freeAbove > 0 && goodsTotal - discount >= freeAbove) shipping = 0;

  // Shipping is treated as part of the same supply and taxed at the highest rate in the cart.
  const shipRate = Math.max(...priced.map((l) => l.gstRate));
  const shipSplit = splitInclusive(shipping, shipRate, taxType);

  return {
    lines: priced,
    goodsTotal,
    discount,
    shipping,
    total: goodsTotal - discount + shipping,
    taxType,
    tax: sumSplits([...priced.map((l) => l.tax), shipSplit]),
  };
}
