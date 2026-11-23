// Edge-safe session tokens (used by middleware and server code). Uses `jose` (no Node-only APIs).
import { SignJWT, jwtVerify } from 'jose';

export const ADMIN_COOKIE = 'rw_admin';
export const CUSTOMER_COOKIE = 'rw_customer';
const ALG = 'HS256';

function adminKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('ADMIN_JWT_SECRET must be set (min 32 characters)');
  return new TextEncoder().encode(secret);
}

// Customers get their own secret when set, so rotating it logs out shoppers without touching admin sessions.
export function customerSecret(): string {
  const secret = process.env.CUSTOMER_JWT_SECRET || process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('CUSTOMER_JWT_SECRET (or ADMIN_JWT_SECRET) must be set (min 32 characters)');
  return secret;
}
const customerKey = () => new TextEncoder().encode(customerSecret());

export async function signAdminToken(email: string, hours = 12): Promise<string> {
  return new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(adminKey());
}

export async function verifyAdminToken(token: string | undefined): Promise<{ email: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, adminKey(), { algorithms: [ALG] });
    return payload.role === 'admin' && typeof payload.email === 'string' ? { email: payload.email } : null;
  } catch {
    return null;
  }
}

export const CUSTOMER_SESSION_DAYS = 30;

export async function signCustomerToken(customerId: string): Promise<string> {
  return new SignJWT({ role: 'customer' })
    .setProtectedHeader({ alg: ALG })
    .setSubject(customerId)
    .setAudience('raazwood-customer')
    .setIssuedAt()
    .setExpirationTime(`${CUSTOMER_SESSION_DAYS}d`)
    .sign(customerKey());
}

export async function verifyCustomerToken(token: string | undefined): Promise<{ customerId: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, customerKey(), { algorithms: [ALG], audience: 'raazwood-customer' });
    return payload.role === 'customer' && typeof payload.sub === 'string' ? { customerId: payload.sub } : null;
  } catch {
    return null;
  }
}
