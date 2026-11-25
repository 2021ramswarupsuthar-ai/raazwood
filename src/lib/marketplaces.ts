// Other platforms where a product is also sold. Links are checked against each platform's own domains so the
// admin cannot paste an unrelated or look-alike address (the link is shown to customers on the product page).
export type Platform = 'AMAZON' | 'FLIPKART' | 'MEESHO';

export const PLATFORMS: { key: Platform; label: string; hosts: string[]; example: string }[] = [
  { key: 'AMAZON', label: 'Amazon', hosts: ['amazon.in', 'amazon.com', 'amzn.in', 'amzn.to', 'a.co', 'amazon'], example: 'https://www.amazon.in/dp/B0XXXXXXXX' },
  { key: 'FLIPKART', label: 'Flipkart', hosts: ['flipkart.com', 'fkrt.it', 'fkrt.cc'], example: 'https://www.flipkart.com/…/p/itm…' },
  { key: 'MEESHO', label: 'Meesho', hosts: ['meesho.com', 'msho.in'], example: 'https://www.meesho.com/…/p/…' },
];

export const platformLabel = (p: string): string => PLATFORMS.find((x) => x.key === p)?.label ?? p;

/** Returns the cleaned https URL, or null when it is not a valid link for that platform. */
export function cleanMarketplaceUrl(platform: Platform, input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > 600) return null;
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  const hosts = PLATFORMS.find((p) => p.key === platform)?.hosts ?? [];
  // exact domain or a subdomain of it ("www.amazon.in"); "amazon" also matches the brand TLD (link.amazon)
  const ok = hosts.some((h) => host === h || host.endsWith(`.${h}`));
  if (!ok) return null;
  u.protocol = 'https:';
  u.hash = '';
  return u.toString();
}
