import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * GET /api/wallet
 * Returns the user's wallet balance, fee rate, lifetime totals, and recent transactions.
 *
 * The wallet is a LEDGER, not a payment processor. Real money movement
 * happens off-platform, fulfilled manually by Hashim via the user's
 * chosen withdrawal method (see TERMS.md §3-4).
 */
export async function GET() {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      isEarlyAdopter: true,
      feeRateLocked: true,
      email: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Ensure wallet exists
  let wallet = await db.wallet.findUnique({
    where: { userId: session.id },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
    },
  })
  if (!wallet) {
    wallet = await db.wallet.create({
      data: { userId: session.id },
      include: { transactions: true },
    })
  }

  const pendingWithdrawals = await db.withdrawalRequest.count({
    where: { userId: session.id, status: 'PENDING' },
  })

  return NextResponse.json({
    wallet: {
      balanceCents: wallet.balanceCents,
      balanceUsd: (wallet.balanceCents / 100).toFixed(2),
      lifetimeEarningsCents: wallet.lifetimeEarningsCents,
      lifetimeEarningsUsd: (wallet.lifetimeEarningsCents / 100).toFixed(2),
      lifetimeFeesCents: wallet.lifetimeFeesCents,
      lifetimeFeesUsd: (wallet.lifetimeFeesCents / 100).toFixed(2),
      lifetimeWithdrawnCents: wallet.lifetimeWithdrawnCents,
      lifetimeWithdrawnUsd: (wallet.lifetimeWithdrawnCents / 100).toFixed(2),
    },
    feeRate: {
      rate: user.feeRateLocked, // 0.28 or 0.35
      ratePercent: (user.feeRateLocked * 100).toFixed(0) + '%',
      isEarlyAdopter: user.isEarlyAdopter,
      description: user.isEarlyAdopter
        ? 'Early Adopter rate — locked at signup, never increases.'
        : 'Standard rate — locked at signup, never increases.',
    },
    pendingWithdrawals,
    transactions: wallet.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amountCents: t.amountCents,
      amountUsd: (t.amountCents / 100).toFixed(2),
      description: t.description,
      status: t.status,
      createdAt: t.createdAt,
    })),
    minimumWithdrawalCents: 2000, // $20.00 USD minimum (see TERMS.md §2.5)
    minimumWithdrawalUsd: '20.00',
  })
}
