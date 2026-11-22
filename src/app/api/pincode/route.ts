import { NextResponse } from 'next/server';
import { deliveryWindow, guessStateFromPincode, isServiceable, isValidPincode } from '@/lib/pincode';
import { stateByCode } from '@/config/states';
import { SERVICEABLE_STATES } from '@/config/store';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const pin = new URL(req.url).searchParams.get('pin') ?? '';
  if (!isValidPincode(pin)) return NextResponse.json({ valid: false });
  const code = guessStateFromPincode(pin);
  const state = code ? stateByCode(code) : undefined;
  const serviceable = code ? isServiceable(code) : SERVICEABLE_STATES === 'ALL';
  const w = deliveryWindow(code ?? 'XX');
  return NextResponse.json({ valid: true, serviceable, stateCode: code, stateName: state?.name ?? null, minDays: w.min, maxDays: w.max });
}
