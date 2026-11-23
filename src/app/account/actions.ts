'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/server/db';
import { endCustomerSession, requireCustomer } from '@/server/customer-auth';
import { addressSchema, profileSchema } from '@/lib/validators';

const bounce = (path: string, msg: string): never => redirect(`${path}?error=${encodeURIComponent(msg)}`);
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '');

export async function logoutAction() {
  await endCustomerSession();
  redirect('/');
}

export async function saveProfileAction(fd: FormData) {
  const c = await requireCustomer('/account/profile');
  const parsed = profileSchema.safeParse({ name: str(fd, 'name'), email: str(fd, 'email') });
  if (!parsed.success) bounce('/account/profile', parsed.error.issues[0].message);
  await prisma.customer.update({ where: { id: c.id }, data: { name: parsed.data!.name, email: parsed.data!.email || null } });
  revalidatePath('/account', 'layout');
  redirect('/account/profile?saved=1');
}

function parseAddress(fd: FormData) {
  return addressSchema.safeParse({
    name: str(fd, 'name'),
    phone: str(fd, 'phone'),
    line1: str(fd, 'line1'),
    line2: str(fd, 'line2'),
    city: str(fd, 'city'),
    stateCode: str(fd, 'stateCode'),
    pincode: str(fd, 'pincode').replace(/\D/g, ''),
    isDefault: fd.get('isDefault') === 'on',
  });
}

/** Create (addressId null) or update one of the customer's own addresses. */
export async function saveAddressAction(addressId: string | null, fd: FormData) {
  const c = await requireCustomer('/account/addresses');
  const parsed = parseAddress(fd);
  if (!parsed.success) bounce('/account/addresses', `${parsed.error.issues[0].path.join('.')}: ${parsed.error.issues[0].message}`);
  const d = parsed.data!;
  const data = { name: d.name, phone: d.phone.replace(/\D/g, '').slice(-10), line1: d.line1, line2: d.line2 || null, city: d.city, stateCode: d.stateCode.toUpperCase(), pincode: d.pincode };
  const count = await prisma.address.count({ where: { customerId: c.id } });
  const makeDefault = Boolean(d.isDefault) || count === 0;

  await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { customerId: c.id }, data: { isDefault: false } });
    if (addressId) {
      const r = await tx.address.updateMany({ where: { id: addressId, customerId: c.id }, data: { ...data, ...(makeDefault ? { isDefault: true } : {}) } });
      if (r.count !== 1) throw new Error('not found');
    } else {
      if (count >= 10) throw new Error('limit');
      await tx.address.create({ data: { ...data, customerId: c.id, isDefault: makeDefault } });
    }
  }).catch((e: Error) => bounce('/account/addresses', e.message === 'limit' ? 'You can save up to 10 addresses.' : 'Could not save the address.'));
  revalidatePath('/account/addresses');
  redirect('/account/addresses?saved=1');
}

export async function deleteAddressAction(addressId: string) {
  const c = await requireCustomer('/account/addresses');
  const a = await prisma.address.findFirst({ where: { id: addressId, customerId: c.id } });
  if (a) {
    await prisma.address.delete({ where: { id: a.id } });
    if (a.isDefault) {
      const next = await prisma.address.findFirst({ where: { customerId: c.id }, orderBy: { createdAt: 'desc' } });
      if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }
  revalidatePath('/account/addresses');
  redirect('/account/addresses');
}

export async function removeFromWishlistAction(productId: string) {
  const c = await requireCustomer('/account/wishlist');
  await prisma.wishlistItem.deleteMany({ where: { customerId: c.id, productId } });
  revalidatePath('/account/wishlist');
  redirect('/account/wishlist');
}
