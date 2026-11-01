import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/session'

/**
 * POST /api/auth/signup
 *
 * Body: {
 *   email, authSalt, authVerifier, vaultSalt, recoverySalt, vaultKeyBlob
 * }
 *
 * The passphrase itself is NEVER sent. The client derives authVerifier
 * (server-comparable) and vaultKeyBlob (recovery-encrypted vault key) before
 * calling this endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, authSalt, authVerifier, vaultSalt, recoverySalt, vaultKeyBlob } = body

    if (!email || !authSalt || !authVerifier || !vaultSalt || !recoverySalt || !vaultKeyBlob) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 },
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 },
      )
    }

    // Early adopter logic: first 10 users get 28% fee rate locked for life.
    // User #11+ get 35% fee rate locked for life.
    // The rate never changes for a given user after signup (see TERMS.md §2).
    const existingCount = await db.user.count()
    const isEarlyAdopter = existingCount < 10
    const feeRateLocked = isEarlyAdopter ? 0.28 : 0.35

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        authSalt,
        authVerifier,
        vaultSalt,
        recoverySalt,
        vaultKeyBlob,
        role: 'USER',
        tier: 'FREE',
        status: 'ACTIVE',
        isEarlyAdopter,
        feeRateLocked,
      },
    })

    // Create empty wallet for the user (ledger — not a real payment account)
    await db.wallet.create({
      data: { userId: user.id },
    })

    // First signed-up user becomes ADMIN (Hashim on first install)
    if (existingCount === 0) {
      await db.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN', tier: 'ELITE' },
      })
    }

    const token = await createSession(user.id)
    await setSessionCookie(token)

    const refreshed = await db.user.findUnique({ where: { id: user.id } })
    return NextResponse.json({
      user: {
        id: refreshed!.id,
        email: refreshed!.email,
        role: refreshed!.role,
        tier: refreshed!.tier,
        status: refreshed!.status,
      },
    })
  } catch (e) {
    console.error('[signup] error', e)
    return NextResponse.json({ error: 'Signup failed.' }, { status: 500 })
  }
}
