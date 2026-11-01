import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/marketplace — list open project briefs (Layer 1)
 * POST /api/marketplace — submit a new project brief (anyone, no auth required for clients)
 *
 * Layer 1 architecture: clients post project briefs without signing up.
 * The AI then matches briefs against decrypted creator vaults (when a creator
 * authorizes the match through their live session).
 *
 * Hashim's contact details (or whoever he delegates to) are surfaced to the
 * matched creator — the actual client-creator conversation happens off-platform
 * via Hashim's separate billing channel.
 */
export async function GET() {
  const posts = await db.marketplacePost.findMany({
    where: { status: 'OPEN' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  // Do NOT expose clientContact to anonymous viewers. Only show structure.
  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      clientName: p.clientName,
      brief: p.brief,
      budget: p.budget,
      timeline: p.timeline,
      requiredSkills: p.requiredSkills,
      createdAt: p.createdAt,
      // clientContact deliberately omitted from public list
    })),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { clientName, clientContact, brief, budget, timeline, requiredSkills } = body

  if (!clientContact || !brief) {
    return NextResponse.json(
      { error: 'Contact and brief are required.' },
      { status: 400 },
    )
  }

  const post = await db.marketplacePost.create({
    data: {
      clientName,
      clientContact,
      brief,
      budget,
      timeline,
      requiredSkills,
      status: 'OPEN',
    },
  })
  return NextResponse.json({
    id: post.id,
    status: post.status,
  })
}
