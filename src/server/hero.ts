import 'server-only';
import sharp from 'sharp';
import { prisma } from './db';
import { effectiveMode, normalizeHero, type HeroMode, type HeroSettings } from '@/lib/hero';

const KEY = 'hero';
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MIN_WIDTH = 800;

export async function getHeroSettings(): Promise<HeroSettings> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } }).catch(() => null);
  return normalizeHero(row?.value);
}

export async function saveHeroSettings(s: HeroSettings): Promise<void> {
  await prisma.siteSetting.upsert({ where: { key: KEY }, update: { value: s }, create: { key: KEY, value: s } });
}

export type PublicSlide = { id: string; imageId: string; width: number; height: number; title: string; subtitle: string; linkUrl: string | null; alt: string };

/** What the homepage should show right now (settings + active slides, with the table as the safe fallback). */
export async function getHeroForHome(): Promise<{ settings: HeroSettings; mode: HeroMode; slides: PublicSlide[] }> {
  const settings = await getHeroSettings();
  if (settings.mode === 'TABLE') return { settings, mode: 'TABLE', slides: [] };
  const rows = await prisma.heroSlide
    .findMany({
      where: { kind: settings.mode === 'PRODUCTS' ? 'PRODUCT' : 'BANNER', isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 6,
      select: { id: true, imageId: true, title: true, subtitle: true, linkUrl: true, image: { select: { width: true, height: true, alt: true } } },
    })
    .catch(() => []);
  const slides = rows.map((r) => ({ id: r.id, imageId: r.imageId, width: r.image.width, height: r.image.height, title: r.title, subtitle: r.subtitle, linkUrl: r.linkUrl, alt: r.title || r.image.alt || 'Raazwood furniture' }));
  return { settings, mode: effectiveMode(settings.mode, slides.length), slides };
}

export class ImageError extends Error {}

/**
 * Takes any JPEG / PNG / WebP the admin uploads and makes it site-ready: respects the camera rotation, removes
 * metadata (GPS etc.), limits it to 2000 px wide (plus a 900 px copy for phones) and re-encodes as WebP.
 * Because the file is fully re-encoded, nothing hidden in the original can ever be served.
 */
export async function processUpload(input: Buffer) {
  if (input.length === 0) throw new ImageError('The file is empty.');
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageError('The file is larger than 8 MB. Please choose a smaller photo.');
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    meta = await sharp(input, { limitInputPixels: 80_000_000 }).metadata();
  } catch {
    throw new ImageError('This file is not a readable image. Please upload a JPG, PNG or WebP photo.');
  }
  if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format)) throw new ImageError('Only JPG, PNG or WebP images are accepted.');
  const base = () => sharp(input, { limitInputPixels: 80_000_000 }).rotate();
  const large = await base().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  if (large.info.width < MIN_WIDTH) throw new ImageError(`The image is too small (${large.info.width}px wide). Please upload one that is at least ${MIN_WIDTH}px wide so it looks sharp.`);
  const small = await base().resize({ width: 900, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  return { large: large.data, small, width: large.info.width, height: large.info.height };
}
