import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * GET /api/vault — return all vault entries for current user (ciphertext only — decrypted client-side)
 * POST /api/vault — create a new encrypted vault entry
 *   Body: { entryType, label, ciphertext, iv }
 *
 * The server stores ONLY ciphertext + iv + structural metadata (entryType, label).
 * The plaintext VALUE of each entry is encrypted client-side and never sent in cleartext.
 *
 * The `label` is operator-visible (so the admin panel can show "user has 5 skills")
 * but the value (e.g. "Senior Next.js developer, 7 yrs, $85/hr floor") is encrypted.
 */
export async function GET() {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const entries = await db.vaultEntry.findMany({
    where: { userId: session.id },
    orderBy: [{ entryType: 'asc' }, { sortIndex: 'asc' }],
  })
  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { entryType, label, ciphertext, iv, value } = body

  if (!entryType || !label) {
    return NextResponse.json({ error: 'entryType and label are required' }, { status: 400 })
  }

  // Compute next sortIndex for this user's entries of this type
  const existing = await db.vaultEntry.count({
    where: { userId: session.id, entryType },
  })

  const entry = await db.vaultEntry.create({
    data: {
      userId: session.id,
      entryType,
      label,
      ciphertext: ciphertext || '',
      iv: iv || '',
      sortIndex: existing,
    },
  })

  return NextResponse.json({ entry })
}
