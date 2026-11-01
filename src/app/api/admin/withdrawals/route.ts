import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * GET /api/admin/withdrawals — ADMIN ONLY
 * Returns all pending withdrawal requests with user Tier 1 data so Hashim
 * can review and contact users to fulfill withdrawals.
 *
 * Hashim's workflow:
 *   1. See pending withdrawal requests here
 *   2. Contact user via their registered contact method (off-platform)
 *   3. Confirm payout details (the encrypted vault has the full method info)
 *   4. Mark request APPROVED → deduct from wallet, send payout off-platform
 *   5. Mark request PAID once funds confirmed sent
 *   6. Or REJECT with reason
 */

export async function GET() {
  const session = await getCurrentUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const requests = await db.withdrawalRequest.findMany({
    where: { status: { in: ['PENDING', 'APPROVED'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          contactMethod: true,
          contactValue: true,
          isEarlyAdopter: true,
          feeRateLocked: true,
        },
      },
    },
    take: 50,
  })

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      grossUsd: (r.grossCents / 100).toFixed(2),
      feeUsd: (r.feeCents / 100).toFixed(2),
      netUsd: (r.netCents / 100).toFixed(2),
      feePercent: (r.feeRate * 100).toFixed(0) + '%',
      isEarlyAdopter: r.isEarlyAdopter,
      methodType: r.methodType,
      methodLabel: r.methodLabel,
      status: r.status,
      adminNotes: r.adminNotes,
      createdAt: r.createdAt,
      processedAt: r.processedAt,
      user: r.user ? {
        email: r.user.email,
        name: r.user.name,
        contactMethod: r.user.contactMethod,
        contactValue: r.user.contactValue,
      } : null,
    })),
  })
}
