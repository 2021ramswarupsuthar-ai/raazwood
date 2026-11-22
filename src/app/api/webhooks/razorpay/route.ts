import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { markOrderPaid } from '@/server/orders';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

type Entity = { id: string; order_id: string; amount: number; status?: string };
type Payload = { event: string; payload?: { payment?: { entity?: Entity } } };

/**
 * Source of truth for payments. Configure in Razorpay Dashboard > Webhooks with events:
 * payment.captured, order.paid, payment.failed. The signature is checked on the RAW body.
 */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'not configured' }, { status: 503 });
  const raw = await req.text();
  const sig = req.headers.get('x-razorpay-signature') ?? '';
  if (!verifyWebhookSignature(raw, sig, secret)) return NextResponse.json({ error: 'bad signature' }, { status: 400 });

  let evt: Payload;
  try { evt = JSON.parse(raw) as Payload; } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const pay = evt.payload?.payment?.entity;
  if (!pay) return NextResponse.json({ ok: true, ignored: true });

  try {
    if (evt.event === 'payment.captured' || evt.event === 'order.paid') {
      const result = await markOrderPaid({ razorpayOrderId: pay.order_id, razorpayPaymentId: pay.id, amountPaise: pay.amount, raw: evt });
      return NextResponse.json({ ok: true, result });
    }
    if (evt.event === 'payment.failed') {
      const order = await prisma.order.findUnique({ where: { razorpayOrderId: pay.order_id }, select: { id: true } });
      if (order) {
        await prisma.payment.upsert({
          where: { providerPaymentId: pay.id },
          update: { status: 'failed' },
          create: { orderId: order.id, providerPaymentId: pay.id, status: 'failed', amountPaise: pay.amount, raw: evt as never },
        });
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: true, ignored: true });
  } catch (e) {
    console.error('webhook processing failed', e);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 }); // Razorpay will retry
  }
}
