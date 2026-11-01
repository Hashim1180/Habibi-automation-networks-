import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/session'

/**
 * POST /api/auth/login/verify
 * Body: { email, authVerifier }
 *
 * Compares the client-derived verifier against the stored verifier using
 * a constant-time comparison. On success, creates a session.
 *
 * NOTE: this is NOT zero-knowledge auth. The server holds the verifier and
 * could theoretically brute-force it offline. The crypto promise we KEEP
 * is that vault contents are zero-knowledge. Auth is "best-effort passphrase
 * gate" — upgrade path is PAKE (SRP/OPAQUE) for true ZK auth.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, authVerifier } = await req.json()
    if (!email || !authVerifier) {
      return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
    }
    const normalizedEmail = String(email).trim().toLowerCase()

    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user || !user.authVerifier) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }
    if (user.status === 'TERMINATED' || user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Account is not active. Contact the operator.' },
        { status: 403 },
      )
    }

    // Constant-time comparison
    const a = Buffer.from(user.authVerifier, 'base64')
    const b = Buffer.from(authVerifier, 'base64')
    if (!constantTimeEqual(a, b)) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    const token = await createSession(user.id)
    await setSessionCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
        status: user.status,
      },
    })
  } catch (e) {
    console.error('[login/verify] error', e)
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 })
  }
}

function constantTimeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}
