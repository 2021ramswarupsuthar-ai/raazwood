import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db';
import { getCustomer } from '@/server/customer-auth';
import { clientIp, jsonError, limiters, tooMany } from '@/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ loggedIn: false, productIds: [] });
  const rows = await prisma.wishlistItem.findMany({ where: { customerId: c.id }, select: { productId: true } });
  return NextResponse.json({ loggedIn: true, productIds: rows.map((r) => r.productId) }, { headers: { 'Cache-Control': 'private, no-store' } });
}

/** Toggle a product in the wishlist. Guests get 401 and the button sends them to the login page. */
export async function POST(req: Request) {
  const rl = limiters.wishlist.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);
  const c = await getCustomer();
  if (!c) return jsonError('Please log in to save items.', 401);
  const body = (await req.json().catch(() => null)) as { productId?: unknown } | null;
  const productId = typeof body?.productId === 'string' ? body.productId.slice(0, 50) : '';
  const product = productId ? await prisma.product.findFirst({ where: { id: productId, isActive: true, deletedAt: null }, select: { id: true } }) : null;
  if (!product) return jsonError('Product not found', 404);
  const existing = await prisma.wishlistItem.findUnique({ where: { customerId_productId: { customerId: c.id, productId } } });
  if (existing) await prisma.wishlistItem.delete({ where: { id: existing.id } });
  else await prisma.wishlistItem.create({ data: { customerId: c.id, productId } });
  revalidatePath('/account/wishlist');
  return NextResponse.json({ saved: !existing });
}
