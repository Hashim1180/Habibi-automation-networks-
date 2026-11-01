import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/**
 * PUT /api/vault/[id] — update an existing vault entry (ciphertext + iv + metadata)
 * DELETE /api/vault/[id] — delete an entry
 *
 * Both routes verify ownership (entry.userId === session.id).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const existing = await db.vaultEntry.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { entryType, label, ciphertext, iv } = body

  const updated = await db.vaultEntry.update({
    where: { id },
    data: {
      entryType: entryType ?? existing.entryType,
      label: label ?? existing.label,
      ciphertext: ciphertext ?? existing.ciphertext,
      iv: iv ?? existing.iv,
    },
  })

  return NextResponse.json({ entry: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const existing = await db.vaultEntry.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await db.vaultEntry.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
