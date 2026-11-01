import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * PATCH /api/admin/withdrawals/[id]
 * Body: { action: "approve" | "reject" | "mark_paid" | "mark_failed", notes?: string }
 *
 * Hashim's withdrawal fulfillment flow:
 *   PENDING → APPROVED  (Hashim has contacted user, confirmed details, sending funds)
 *     - On APPROVE: deduct grossCents from wallet balance
 *     - Create two Transaction records: negative "withdrawal" + negative "fee"
 *   APPROVED → PAID     (funds confirmed sent to user's withdrawal method)
 *   PENDING/APPROVED → REJECTED  (Hashim decided not to fulfill; funds remain in wallet)
 *   APPROVED → FAILED   (payout attempt failed; reverse the deduction)
 *
 * The actual money movement is OFF-PLATFORM — Hashim fulfills via the
 * user's chosen withdrawal method manually. This endpoint only updates
 * the ledger state.
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { action, notes } = body

  if (!['approve', 'reject', 'mark_paid', 'mark_failed'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const request = await db.withdrawalRequest.findUnique({
    where: { id },
    include: { user: true },
  })
  if (!request) {
    return NextResponse.json({ error: 'Withdrawal request not found' }, { status: 404 })
  }

  if (action === 'approve') {
    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Can only approve PENDING requests' }, { status: 400 })
    }

    // Deduct from wallet and create ledger entries
    const wallet = await db.wallet.findUnique({ where: { userId: request.userId } })
    if (!wallet) {
      return NextResponse.json({ error: 'User wallet not found' }, { status: 404 })
    }
    if (wallet.balanceCents < request.grossCents) {
      return NextResponse.json({
        error: `User balance insufficient. Balance: $${(wallet.balanceCents / 100).toFixed(2)}, requested: $${(request.grossCents / 100).toFixed(2)}`,
      }, { status: 400 })
    }

    // Transaction 1: gross withdrawal (debit)
    await db.transaction.create({
      data: {
        walletId: wallet.id,
        userId: request.userId,
        type: 'withdrawal',
        amountCents: -request.grossCents,
        description: `Withdrawal to ${request.methodLabel}`,
        withdrawalRequestId: request.id,
        status: 'COMPLETED',
      },
    })
    // Transaction 2: fee (operator cut)
    await db.transaction.create({
      data: {
        walletId: wallet.id,
        userId: request.userId,
        type: 'fee',
        amountCents: -request.feeCents,
        description: `Platform fee (${(request.feeRate * 100).toFixed(0)}%) on withdrawal ${request.id.slice(-6)}`,
        withdrawalRequestId: request.id,
        status: 'COMPLETED',
      },
    })

    // Update wallet balances
    await db.wallet.update({
      where: { id: wallet.id },
      data: {
        balanceCents: { decrement: request.grossCents },
        lifetimeFeesCents: { increment: request.feeCents },
        // Note: lifetimeWithdrawnCents is incremented when status becomes PAID
      },
    })

    const updated = await db.withdrawalRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        adminNotes: notes || null,
        processedAt: new Date(),
      },
    })
    return NextResponse.json({ request: updated })
  }

  if (action === 'reject') {
    if (!['PENDING', 'APPROVED'].includes(request.status)) {
      return NextResponse.json({ error: 'Can only reject PENDING or APPROVED requests' }, { status: 400 })
    }

    // If was APPROVED, the wallet was already deducted — reverse it.
    if (request.status === 'APPROVED') {
      const wallet = await db.wallet.findUnique({ where: { userId: request.userId } })
      if (wallet) {
        // Reverse the deduction
        await db.transaction.create({
          data: {
            walletId: wallet.id,
            userId: request.userId,
            type: 'adjustment',
            amountCents: request.grossCents, // positive — refund
            description: `Reversal of rejected withdrawal ${request.id.slice(-6)}`,
            withdrawalRequestId: request.id,
            status: 'COMPLETED',
          },
        })
        await db.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceCents: { increment: request.grossCents },
            lifetimeFeesCents: { decrement: request.feeCents },
          },
        })
      }
    }

    const updated = await db.withdrawalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNotes: notes || null,
        processedAt: new Date(),
      },
    })
    return NextResponse.json({ request: updated })
  }

  if (action === 'mark_paid') {
    if (request.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Can only mark APPROVED requests as PAID' }, { status: 400 })
    }
    // Increment lifetimeWithdrawnCents
    const wallet = await db.wallet.findUnique({ where: { userId: request.userId } })
    if (wallet) {
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          lifetimeWithdrawnCents: { increment: request.netCents },
        },
      })
    }
    const updated = await db.withdrawalRequest.update({
      where: { id },
      data: {
        status: 'PAID',
        adminNotes: notes || request.adminNotes,
        processedAt: new Date(),
      },
    })
    return NextResponse.json({ request: updated })
  }

  if (action === 'mark_failed') {
    if (request.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Can only mark APPROVED requests as FAILED' }, { status: 400 })
    }
    // Reverse the deduction (same as reject for APPROVED state)
    const wallet = await db.wallet.findUnique({ where: { userId: request.userId } })
    if (wallet) {
      await db.transaction.create({
        data: {
          walletId: wallet.id,
          userId: request.userId,
          type: 'adjustment',
          amountCents: request.grossCents,
          description: `Reversal of failed withdrawal ${request.id.slice(-6)}`,
          withdrawalRequestId: request.id,
          status: 'COMPLETED',
        },
      })
      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: { increment: request.grossCents },
          lifetimeFeesCents: { decrement: request.feeCents },
        },
      })
    }
    const updated = await db.withdrawalRequest.update({
      where: { id },
      data: {
        status: 'FAILED',
        adminNotes: notes || null,
        processedAt: new Date(),
      },
    })
    return NextResponse.json({ request: updated })
  }

  return NextResponse.json({ error: 'Unhandled action' }, { status: 400 })
}
