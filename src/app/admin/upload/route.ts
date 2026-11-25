import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth-token';
import { ImageError, processUpload } from '@/server/hero';
import { MAX_SLIDES, cleanHeroLink } from '@/lib/hero';
import { audit } from '@/server/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST multipart: file, kind (PRODUCT | BANNER), title?, subtitle?, link?. Admin only. Creates the image and its slide. */
export async function POST(req: Request) {
  const session = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Could not read the upload.' }, { status: 400 }); }
  const file = form.get('file');
  const kind = form.get('kind') === 'BANNER' ? 'BANNER' : form.get('kind') === 'PRODUCT' ? 'PRODUCT' : null;
  if (!(file instanceof File) || !kind) return NextResponse.json({ error: 'Choose an image first.' }, { status: 400 });

  const title = String(form.get('title') ?? '').trim().slice(0, 80);
  const subtitle = String(form.get('subtitle') ?? '').trim().slice(0, 160);
  const link = cleanHeroLink(String(form.get('link') ?? ''));
  if (link === null) return NextResponse.json({ error: 'The link must start with / (a page on this site) or https://.' }, { status: 400 });

  const count = await prisma.heroSlide.count({ where: { kind } });
  if (count >= MAX_SLIDES) return NextResponse.json({ error: `You can keep up to ${MAX_SLIDES} images here. Delete one first.` }, { status: 400 });

  try {
    const out = await processUpload(Buffer.from(await file.arrayBuffer()));
    const last = await prisma.heroSlide.findFirst({ where: { kind }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    const slide = await prisma.heroSlide.create({
      data: {
        kind, title, subtitle, linkUrl: link || null, sortOrder: (last?.sortOrder ?? 0) + 1,
        image: { create: { large: out.large, small: out.small, width: out.width, height: out.height, bytes: out.large.length, alt: title } },
      },
      select: { id: true, imageId: true },
    });
    await audit(session.email, 'hero.upload', 'HeroSlide', slide.id, { kind, width: out.width, height: out.height, kb: Math.round(out.large.length / 1024) });
    revalidatePath('/');
    return NextResponse.json({ ok: true, ...slide, width: out.width, height: out.height, kb: Math.round(out.large.length / 1024) });
  } catch (e) {
    if (e instanceof ImageError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('hero upload failed', e);
    return NextResponse.json({ error: 'Could not process the image. Please try another photo.' }, { status: 500 });
  }
}
