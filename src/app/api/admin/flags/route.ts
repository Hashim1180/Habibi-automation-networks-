import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * POST /api/admin/flags — ADMIN ONLY
 * Manually flag a user for misuse review (Hashim's direct action).
 * Body: { userId, reason, severity, context }
 *
 * In the design, this is the ONLY way a flag gets created. The system itself
 * does not auto-lock users — it surfaces flags for Hashim to handle personally
 * (per his instruction: "I would talk directly to the person who is misusing it").
 *
 * Hashim then updates status (SUSPECTED/SUSPENDED/TERMINATED) via direct DB
 * action or a future admin endpoint, but the resolution is human-to-human.
 */
export async function POST(req: NextRequest) {
  const session = await getCurrentUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  const { userId, reason, severity, context } = await req.json()
  if (!userId || !reason) {
    return NextResponse.json({ error: 'userId and reason required' }, { status: 400 })
  }
  const flag = await db.misuseFlag.create({
    data: {
      userId,
      raisedById: session.id,
      reason,
      severity: severity || 'LOW',
      context: context ? JSON.stringify(context) : null,
      status: 'OPEN',
    },
  })
  return NextResponse.json({ flag })
}

export async function GET() {
  const session = await getCurrentUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  const flags = await db.misuseFlag.findMany({
    where: { status: 'OPEN' },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { email: true, name: true } } },
  })
  return NextResponse.json({ flags })
}
