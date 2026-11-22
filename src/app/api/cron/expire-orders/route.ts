import { NextResponse } from 'next/server';
import { releaseExpiredOrders } from '@/server/orders';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const released = await releaseExpiredOrders();
  return NextResponse.json({ ok: true, released });
}
