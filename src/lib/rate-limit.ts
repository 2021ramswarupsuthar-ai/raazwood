// Simple in-memory sliding-window limiter. On Vercel serverless each instance has its own memory, so this is a
// best-effort guard (stops bursts). For strict limits use a shared store (e.g. Upstash Redis) later.
export type Limiter = { check: (key: string, now?: number) => { ok: boolean; remaining: number; retryAfterMs: number } };

export function createLimiter(opts: { windowMs: number; max: number }): Limiter {
  const hits = new Map<string, number[]>();
  return {
    check(key, now = Date.now()) {
      const from = now - opts.windowMs;
      const arr = (hits.get(key) ?? []).filter((t) => t > from);
      if (arr.length >= opts.max) {
        hits.set(key, arr);
        return { ok: false, remaining: 0, retryAfterMs: arr[0] + opts.windowMs - now };
      }
      arr.push(now);
      hits.set(key, arr);
      if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => t > from)) hits.delete(k);
      return { ok: true, remaining: opts.max - arr.length, retryAfterMs: 0 };
    },
  };
}
