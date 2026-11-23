import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from './db';

/** Record an admin change (price, stock, order status, coupons...). Never throws: auditing must not block work. */
export async function audit(actor: string, action: string, entity: string, entityId?: string | null, detail?: Record<string, unknown>): Promise<void> {
  try {
    await prisma.auditLog.create({ data: { actor, action, entity, entityId: entityId ?? null, detail: (detail ?? undefined) as Prisma.InputJsonValue | undefined } });
  } catch (e) {
    console.error('audit log write failed', e);
  }
}
