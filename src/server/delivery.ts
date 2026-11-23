import 'server-only';
import { prisma } from './db';
import { deliveryWindow, isServiceable } from '@/lib/pincode';

export type Zone = { stateCode: string; serviceable: boolean; minDays: number; maxDays: number; extraShippingPaise: number; custom: boolean };

/** Defaults come from src/config/store.ts; a DeliveryZone row (edited in admin) overrides them per state. */
export function defaultZone(stateCode: string): Zone {
  const w = deliveryWindow(stateCode);
  return { stateCode, serviceable: isServiceable(stateCode), minDays: w.min, maxDays: w.max, extraShippingPaise: 0, custom: false };
}

export async function getZone(stateCode: string): Promise<Zone> {
  const code = stateCode.toUpperCase();
  const row = await prisma.deliveryZone.findUnique({ where: { stateCode: code } }).catch(() => null);
  return row ? { stateCode: code, serviceable: row.serviceable, minDays: row.minDays, maxDays: row.maxDays, extraShippingPaise: row.extraShippingPaise, custom: true } : defaultZone(code);
}

export async function getAllZones(codes: string[]): Promise<Map<string, Zone>> {
  const rows = await prisma.deliveryZone.findMany();
  const byCode = new Map(rows.map((r) => [r.stateCode, r]));
  return new Map(codes.map((c) => {
    const r = byCode.get(c);
    return [c, r ? { stateCode: c, serviceable: r.serviceable, minDays: r.minDays, maxDays: r.maxDays, extraShippingPaise: r.extraShippingPaise, custom: true } : defaultZone(c)];
  }));
}
