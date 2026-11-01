import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * GET /api/admin/users — ADMIN ONLY
 * Returns Tier 1 data + vault metadata for all users.
 * Vault CONTENTS (ciphertext) are intentionally NOT returned — operator sees structure only.
 *
 * This is the core of the "even I can't access it" promise:
 * Hashim's admin panel shows: name, contact, feedback, vault entry count, vault entry types, last update.
 * Hashim cannot see: skill names, pricing floors, portfolio URLs, API keys, any value.
 */
export async function GET() {
  const session = await getCurrentUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const users = await db.user.findMany({
    where: { role: 'USER' },
    orderBy: { createdAt: 'desc' },
    include: {
      vaultEntries: {
        select: { id: true, entryType: true, label: true, updatedAt: true },
      },
      flagsFiled: { where: { status: 'OPEN' }, select: { id: true, reason: true, severity: true } },
    },
  })

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      contactMethod: u.contactMethod,
      contactValue: u.contactValue,
      feedback: u.feedback,
      tier: u.tier,
      status: u.status,
      createdAt: u.createdAt,
      vault: {
        entryCount: u.vaultEntries.length,
        entryTypes: Array.from(new Set(u.vaultEntries.map((e) => e.entryType))),
        labels: u.vaultEntries.map((e) => ({ type: e.entryType, label: e.label, updatedAt: e.updatedAt })),
        // NOTE: ciphertext deliberately omitted. Hashim cannot read vault contents.
      },
      openFlags: u.flagsFiled,
    })),
  })
}
