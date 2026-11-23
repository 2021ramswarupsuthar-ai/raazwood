import { NextResponse } from 'next/server';
import { suggestProducts } from '@/server/catalog';
import { clientIp, limiters, tooMany } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const rl = limiters.search.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ items: [] });
  const items = await suggestProducts(q).catch(() => []);
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
