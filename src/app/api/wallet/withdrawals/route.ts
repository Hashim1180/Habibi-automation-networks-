import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * GET /api/wallet/withdrawals — list current user's withdrawal requests
 * POST /api/wallet/withdrawals — create a new withdrawal request
 *
 * Request body for POST:
 *   { amountCents, methodType, methodLabel, methodVaultEntryId }
 *
 * The server:
 *   1. Looks up the user's locked fee rate (28% or 35%)
 *   2. Calculates feeCents and netCents
 *   3. Validates amount ≥ minimum ($20.00) and ≤ wallet balance
 *   4. Creates the WithdrawalRequest in PENDING status
 *   5. DOES NOT deduct from wallet balance yet — only after admin approval
 *
 * The withdrawal method DETAILS (phone, account number) are encrypted in
 * the user's VaultEntry with entryType="withdrawal_method". The server
 * only receives the methodType + methodLabel (human-readable) so Hashim
 * can see which method to use. Hashim contacts the user to confirm full
 * payout details before sending funds.
 */

const VALID_METHOD_TYPES = ['jazzcash', 'easypaisa', 'nayapay', 'paytm', 'upi', 'paypal', 'bank', 'other']
const MIN_WITHDRAWAL_CENTS = 2000 // $20.00 (see TERMS.md §2.5)

export async function GET() {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const requests = await db.withdrawalRequest.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { amountCents, methodType, methodLabel, methodVaultEntryId } = body

  // Validate inputs
  if (!amountCents || typeof amountCents !== 'number' || amountCents <= 0) {
    return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
  }
  if (!VALID_METHOD_TYPES.includes(methodType)) {
    return NextResponse.json({ error: 'Invalid withdrawal method type.' }, { status: 400 })
  }
  if (!methodLabel || typeof methodLabel !== 'string') {
    return NextResponse.json({ error: 'Method label required.' }, { status: 400 })
  }
  if (amountCents < MIN_WITHDRAWAL_CENTS) {
    return NextResponse.json({
      error: `Minimum withdrawal is $${(MIN_WITHDRAWAL_CENTS / 100).toFixed(2)} USD.`,
    }, { status: 400 })
  }

  // Fetch user + wallet
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { isEarlyAdopter: true, feeRateLocked: true, status: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }
  if (user.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Account not active. Contact operator.' }, { status: 403 })
  }

  let wallet = await db.wallet.findUnique({ where: { userId: session.id } })
  if (!wallet) {
    wallet = await db.wallet.create({ data: { userId: session.id } })
  }

  if (amountCents > wallet.balanceCents) {
    return NextResponse.json({
      error: `Insufficient balance. Current balance: $${(wallet.balanceCents / 100).toFixed(2)}.`,
    }, { status: 400 })
  }

  // Calculate fee
  const feeCents = Math.round(amountCents * user.feeRateLocked)
  const netCents = amountCents - feeCents

  // Create the withdrawal request (status PENDING)
  const request = await db.withdrawalRequest.create({
    data: {
      userId: session.id,
      grossCents: amountCents,
      feeCents,
      netCents,
      feeRate: user.feeRateLocked,
      isEarlyAdopter: user.isEarlyAdopter,
      methodType,
      methodLabel,
      methodVaultEntryId: methodVaultEntryId || null,
      status: 'PENDING',
    },
  })

  return NextResponse.json({
    request,
    summary: {
      grossUsd: (amountCents / 100).toFixed(2),
      feeUsd: (feeCents / 100).toFixed(2),
      feePercent: (user.feeRateLocked * 100).toFixed(0) + '%',
      netUsd: (netCents / 100).toFixed(2),
      methodLabel,
      status: 'PENDING',
      note: 'Hashim will review and contact you via your registered contact method to confirm payout details.',
    },
  })
}
