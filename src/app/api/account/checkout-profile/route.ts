import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { getCustomer } from '@/server/customer-auth';

export const dynamic = 'force-dynamic';

/** Lets the (static) checkout page pre-fill details for a logged-in customer. Guests get { loggedIn: false }. */
export async function GET() {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ loggedIn: false });
  const addresses = await prisma.address.findMany({ where: { customerId: c.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }], take: 10 });
  return NextResponse.json(
    {
      loggedIn: true,
      name: c.name,
      phone: c.phone,
      email: c.email ?? '',
      addresses: addresses.map((a) => ({ id: a.id, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? '', city: a.city, stateCode: a.stateCode, pincode: a.pincode, isDefault: a.isDefault })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
