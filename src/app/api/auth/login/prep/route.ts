import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/auth/login/prep
 * Body: { email }
 * Returns: { exists, authSalt, vaultSalt } if user exists
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required.' }, { status: 400 })
    }
    const normalizedEmail = String(email).trim().toLowerCase()

    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return NextResponse.json(
        { exists: false, error: 'No account with that email.' },
        { status: 404 },
      )
    }
    if (user.status === 'TERMINATED') {
      return NextResponse.json(
        { exists: false, error: 'Account terminated. Contact the operator.' },
        { status: 403 },
      )
    }
    return NextResponse.json({
      exists: true,
      authSalt: user.authSalt,
      vaultSalt: user.vaultSalt,
    })
  } catch (e) {
    console.error('[login/prep] error', e)
    return NextResponse.json({ error: 'Login prep failed.' }, { status: 500 })
  }
}
