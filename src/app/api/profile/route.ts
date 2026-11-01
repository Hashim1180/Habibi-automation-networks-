import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * GET /api/profile — return Tier 1 profile (operator-readable fields)
 * PUT /api/profile — update Tier 1 profile
 *
 * Tier 1 fields: name, contactMethod, contactValue, feedback
 * These are the ONLY PII the operator (Hashim) can see.
 */
export async function GET() {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await db.user.findUnique({ where: { id: session.id } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  return NextResponse.json({
    profile: {
      email: user.email,
      name: user.name,
      contactMethod: user.contactMethod,
      contactValue: user.contactValue,
      feedback: user.feedback,
      tier: user.tier,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    },
  })
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { name, contactMethod, contactValue, feedback } = body

  // Validate contact method
  const validMethods = ['email', 'phone', 'whatsapp']
  if (contactMethod && !validMethods.includes(contactMethod)) {
    return NextResponse.json({ error: 'Invalid contact method' }, { status: 400 })
  }

  // Hashim needs at least name + contact to do his job. If user is on a paid tier
  // or has been approved, require them. For v1, allow partial — they can complete later.
  const updated = await db.user.update({
    where: { id: session.id },
    data: {
      name: name ?? undefined,
      contactMethod: contactMethod ?? undefined,
      contactValue: contactValue ?? undefined,
      feedback: feedback ?? undefined,
    },
  })

  return NextResponse.json({
    profile: {
      email: updated.email,
      name: updated.name,
      contactMethod: updated.contactMethod,
      contactValue: updated.contactValue,
      feedback: updated.feedback,
    },
  })
}
