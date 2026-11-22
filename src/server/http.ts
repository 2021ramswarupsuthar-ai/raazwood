import 'server-only';
import { NextResponse } from 'next/server';
import { createLimiter } from '@/lib/rate-limit';

export const limiters = {
  quote: createLimiter({ windowMs: 60_000, max: 40 }),
  checkout: createLimiter({ windowMs: 60_000, max: 6 }),
  verify: createLimiter({ windowMs: 60_000, max: 20 }),
  assistant: createLimiter({ windowMs: 60_000, max: 10 }),
  login: createLimiter({ windowMs: 15 * 60_000, max: 8 }),
};

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

export const jsonError = (message: string, status = 400, extra: Record<string, unknown> = {}) => NextResponse.json({ error: message, ...extra }, { status });

export function tooMany(retryAfterMs: number) {
  return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } });
}
