import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'safevault_super_secret_jwt_key_2026_change_in_production';
const key = new TextEncoder().encode(JWT_SECRET);

export const COOKIE_NAME = 'safevault_auth_token';

export interface UserJwtPayload {
  userId: string;
  email: string;
}

export async function signToken(payload: UserJwtPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key);
}

export async function verifyToken(token: string): Promise<UserJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch (error) {
    return null;
  }
}

export async function getSessionUser(): Promise<UserJwtPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function getAuthUserFromRequest(request: NextRequest): Promise<UserJwtPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return await verifyToken(token);
}
