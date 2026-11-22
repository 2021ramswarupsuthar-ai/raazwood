import { NextResponse } from 'next/server';
import { quoteSchema } from '@/lib/validators';
import { quoteCart, OrderError } from '@/server/orders';
import { isServiceable, deliveryWindow } from '@/lib/pincode';
import { clientIp, jsonError, limiters, tooMany } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const rl = limiters.quote.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);
  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid request');
  const { items, stateCode } = parsed.data;
  const st = stateCode.toUpperCase();
  try {
    const { totals } = await quoteCart(items, st);
    const w = deliveryWindow(st);
    return NextResponse.json({
      serviceable: isServiceable(st),
      goodsTotalPaise: totals.goodsTotal,
      shippingPaise: totals.shipping,
      totalPaise: totals.total,
      taxKind: totals.taxType,
      taxPaise: totals.tax.tax,
      cgstPaise: totals.tax.cgst,
      sgstPaise: totals.tax.sgst,
      igstPaise: totals.tax.igst,
      minDays: w.min,
      maxDays: w.max,
    });
  } catch (e) {
    if (e instanceof OrderError) return jsonError(e.message, 409, { code: e.code });
    return jsonError('Could not price your cart', 500);
  }
}
