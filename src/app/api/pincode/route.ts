import { NextResponse } from 'next/server';
import { guessStateFromPincode, isValidPincode } from '@/lib/pincode';
import { stateByCode } from '@/config/states';
import { DELIVERY_DAYS, SERVICEABLE_STATES } from '@/config/store';
import { getZone } from '@/server/delivery';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const pin = new URL(req.url).searchParams.get('pin') ?? '';
  if (!isValidPincode(pin)) return NextResponse.json({ valid: false });
  const code = guessStateFromPincode(pin);
  if (!code) {
    // unknown circle: be honest that the state decides, and fall back to the general estimate
    return NextResponse.json({ valid: true, serviceable: SERVICEABLE_STATES === 'ALL', stateCode: null, stateName: null, minDays: DELIVERY_DAYS.other.min, maxDays: DELIVERY_DAYS.other.max });
  }
  const z = await getZone(code);
  return NextResponse.json({ valid: true, serviceable: z.serviceable, stateCode: code, stateName: stateByCode(code)?.name ?? null, minDays: z.minDays, maxDays: z.maxDays });
}
