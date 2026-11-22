import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await ctx.params;
  const o = await prisma.order.findUnique({ where: { publicId }, select: { status: true } });
  return o ? NextResponse.json({ status: o.status }) : NextResponse.json({ error: 'not found' }, { status: 404 });
}
