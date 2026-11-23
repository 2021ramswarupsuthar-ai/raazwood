import { NextResponse } from 'next/server';
import { quoteSchema } from '@/lib/validators';
import { quoteCart, OrderError } from '@/server/orders';
import { clientIp, jsonError, limiters, tooMany } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = limiters.quote.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);
  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid request');
  const { items, stateCode, couponCode } = parsed.data;
  const st = stateCode.toUpperCase();
  try {
    const { totals, zone, coupon } = await quoteCart(items, st, { couponCode });
    return NextResponse.json({
      serviceable: zone.serviceable,
      goodsTotalPaise: totals.goodsTotal,
      discountPaise: totals.discount,
      coupon: coupon ? ('error' in coupon ? { code: coupon.code, error: coupon.error } : { code: coupon.code, discountPaise: coupon.discountPaise }) : null,
      shippingPaise: totals.shipping,
      totalPaise: totals.total,
      taxKind: totals.taxType,
      taxPaise: totals.tax.tax,
      cgstPaise: totals.tax.cgst,
      sgstPaise: totals.tax.sgst,
      igstPaise: totals.tax.igst,
      minDays: zone.minDays,
      maxDays: zone.maxDays,
    });
  } catch (e) {
    if (e instanceof OrderError) return jsonError(e.message, 409, { code: e.code, ...(e.missing ? { missing: e.missing } : {}) });
    return jsonError('Could not price your cart', 500);
  }
}
