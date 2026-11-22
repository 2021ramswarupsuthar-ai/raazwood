// Edge-safe admin session token (used by middleware and server code). Uses `jose` (no Node-only APIs).
import { SignJWT, jwtVerify } from 'jose';

export const ADMIN_COOKIE = 'rw_admin';
const ALG = 'HS256';

function key(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('ADMIN_JWT_SECRET must be set (min 32 characters)');
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(email: string, hours = 12): Promise<string> {
  return new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(key());
}

export async function verifyAdminToken(token: string | undefined): Promise<{ email: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: [ALG] });
    return payload.role === 'admin' && typeof payload.email === 'string' ? { email: payload.email } : null;
  } catch {
    return null;
  }
}
