/**
 * Server-side session management.
 *
 * Sessions are HttpOnly + SameSite=Lax cookies containing a 32-byte hex token.
 * The token is looked up in the Session table; on match, the user is authenticated.
 *
 * We do NOT use NextAuth for v1 — the auth flow here is custom (passphrase verifier)
 * and rolling our own minimal session keeps the surface area small and auditable.
 */

import { db } from '@/lib/db'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'habibi_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

export interface SessionUser {
  id: string
  email: string | null
  name: string | null
  role: string
  tier: string
  status: string
}

function randomToken(): string {
  // 32 bytes hex
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.session.create({
    data: { userId, token, expiresAt },
  })
  return token
}

export async function setSessionCookie(token: string) {
  const expires = new Date(Date.now() + SESSION_TTL_MS)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } })
    return null
  }
  if (session.user.status === 'TERMINATED' || session.user.status === 'SUSPENDED') {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    tier: session.user.tier,
    status: session.user.status,
  }
}

export async function logout() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {})
  }
  await clearSessionCookie()
}
