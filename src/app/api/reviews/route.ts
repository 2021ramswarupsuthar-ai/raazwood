import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getCustomer } from '@/server/customer-auth';
import { reviewSchema } from '@/lib/validators';
import { clientIp, jsonError, limiters, tooMany } from '@/server/http';

export const dynamic = 'force-dynamic';

/** Logged-in customers can review a product once. Reviews are shown only after an admin approves them. */
export async function POST(req: Request) {
  const rl = limiters.review.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);
  const c = await getCustomer();
  if (!c) return jsonError('Please log in to write a review.', 401);
  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid review');
  const d = parsed.data;
  const product = await prisma.product.findFirst({ where: { id: d.productId, isActive: true, deletedAt: null }, select: { id: true } });
  if (!product) return jsonError('Product not found', 404);
  if (await prisma.review.findUnique({ where: { productId_customerId: { productId: d.productId, customerId: c.id } } })) {
    return jsonError('You have already reviewed this product. Thank you!', 409);
  }
  // "Verified purchase" = this customer (or their phone) has a paid order containing this product.
  const bought = await prisma.orderItem.findFirst({
    where: { variant: { productId: d.productId }, order: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }, OR: [{ customerId: c.id }, { phone: c.phone }] } },
    select: { id: true },
  });
  await prisma.review.create({
    data: {
      productId: d.productId,
      customerId: c.id,
      rating: d.rating,
      title: d.title,
      body: d.body,
      city: d.city || null,
      authorName: c.name.trim().split(/\s+/)[0] || 'Customer',
      verified: Boolean(bought),
    },
  });
  return NextResponse.json({ ok: true, message: 'Thank you! Your review will appear after a quick check.' });
}
