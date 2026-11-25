import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

/** Serves an uploaded site image. GET /media/<id> (large) or /media/<id>?s=sm (900 px, for phones). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) return new Response('Not found', { status: 404 });
  const small = new URL(req.url).searchParams.get('s') === 'sm';
  const etag = `"${id}-${small ? 's' : 'l'}"`;
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { ETag: etag } });

  const img = await prisma.siteImage.findUnique({ where: { id }, select: { small: small, large: !small, mime: true } });
  if (!img) return new Response('Not found', { status: 404 });
  const data = (small ? img.small : img.large) as Uint8Array;
  return new Response(Buffer.from(data), {
    headers: {
      'Content-Type': img.mime,
      // an image id never changes its content (a new upload gets a new id), so it can be cached for a year
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
