import { NextResponse } from 'next/server';
import { z } from 'zod';
import { answer } from '@/lib/ai/assistant';
import { providersFromEnv } from '@/lib/ai/provider';
import { rankProducts } from '@/lib/ai/rules';
import { deliveryWindow, guessStateFromPincode, isServiceable, isValidPincode } from '@/lib/pincode';
import { listProducts } from '@/server/catalog';
import { clientIp, jsonError, limiters, tooMany } from '@/server/http';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(1000) })).min(1).max(10),
});

// Best-effort daily cap so the free AI quota is never exhausted by one visitor or a bot.
let day = '';
let used = 0;
function underDailyCap(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; used = 0; }
  const cap = Number(process.env.ASSISTANT_DAILY_REQUEST_CAP ?? 400);
  return used++ < cap;
}

let cache: { at: number; items: Awaited<ReturnType<typeof listProducts>> } | null = null;
async function catalog() {
  if (!cache || Date.now() - cache.at > 5 * 60_000) cache = { at: Date.now(), items: await listProducts() };
  return cache.items;
}

export async function POST(req: Request) {
  const rl = limiters.assistant.check(clientIp(req));
  if (!rl.ok) return tooMany(rl.retryAfterMs);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError('Invalid request');

  const providers = underDailyCap() ? providersFromEnv() : []; // over the cap: rule-based mode only
  try {
    const result = await answer(parsed.data.messages, {
      providers,
      searchProducts: async (q) => {
        const all = await catalog();
        return rankProducts(q, all.map((p) => ({ ...p, category: p.category.name })), 4).map((p) => ({ slug: p.slug, name: p.name, fromPricePaise: p.fromPricePaise, category: p.category, inStock: p.inStock }));
      },
      pincodeInfo: (pin) => {
        if (!isValidPincode(pin)) return null;
        const st = guessStateFromPincode(pin);
        const w = deliveryWindow(st ?? 'XX');
        return { serviceable: st ? isServiceable(st) : true, minDays: w.min, maxDays: w.max };
      },
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ reply: 'Sorry, I could not process that. You can message our team on WhatsApp.', products: [], mode: 'rules', handoff: true });
  }
}
