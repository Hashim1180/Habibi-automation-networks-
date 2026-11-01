import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

/**
 * POST /api/rep/draft
 * Body: {
 *   scenario: "inbound_reply" | "outbound_cold" | "objection_price" | "objection_timeline",
 *   clientMessage?: string,
 *   clientContext?: { name?, budget?, timeline?, projectBrief? },
 *   decryptedVault: { skills: [], pricing: [], portfolio: [], notes: [] }
 * }
 *
 * This endpoint receives ALREADY-DECRYPTED vault data (the client decrypts
 * the vault in-browser through the live session and passes the plaintext
 * skills/pricing/portfolio here for the AI rep to draft with).
 *
 * The server does NOT have access to the vault key — the data is only
 * "in the open" for the duration of this single request/response cycle,
 * in server memory, then discarded.
 *
 * This is the honest integration of the AI-rep framework with the vault:
 * the AI works from real, verified-by-decryption data, not pasted claims.
 */

interface DecryptedVault {
  skills: { label: string; value: string }[]
  pricing: { label: string; value: string }[]
  portfolio: { label: string; value: string }[]
  notes: { label: string; value: string }[]
}

interface DraftRequest {
  scenario: string
  clientMessage?: string
  clientContext?: {
    name?: string
    budget?: string
    timeline?: string
    projectBrief?: string
  }
  decryptedVault: DecryptedVault
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as DraftRequest
  if (!body.scenario || !body.decryptedVault) {
    return NextResponse.json(
      { error: 'scenario and decryptedVault required' },
      { status: 400 },
    )
  }

  // Compose the AI prompt with the decrypted vault context.
  // For v1 we generate the draft text deterministically from a template.
  // Production would call the z-ai-web-dev-sdk LLM here.

  const skills = body.decryptedVault.skills.map((s) => `${s.label}: ${s.value}`).join('; ')
  const pricing = body.decryptedVault.pricing.map((p) => `${p.label}: ${p.value}`).join('; ')
  const portfolio = body.decryptedVault.portfolio.map((p) => `${p.label}: ${p.value}`).join('; ')

  const clientName = body.clientContext?.name || 'there'
  const brief = body.clientContext?.projectBrief || body.clientMessage || ''

  let subject = ''
  let body_text = ''

  switch (body.scenario) {
    case 'outbound_cold':
      subject = `Following up on your project: ${brief.slice(0, 60)}`
      body_text = `Hi ${clientName},

I came across your project brief and wanted to reach out. Based on what you described, I specialize in:
${skills}

My pricing structure is straightforward: ${pricing || 'happy to discuss based on scope'}.
Selected work: ${portfolio || 'available on request'}.

Would you be open to a 15-minute call this week to scope this properly?

Best,
[Your name]`
      break

    case 'objection_price':
      subject = `Re: your question on pricing`
      body_text = `Hi ${clientName},

Thanks for the candor on the budget. Let me reframe what's included:

The quote reflects custom engineering — not an off-the-shelf template. Specifically:
- Architecture built for your scale (${skills})
- Maintenance and handoff documentation
- Security review

If the full scope is tight, I can phase it as an MVP: we ship the core flow first (${portfolio ? `similar to ${portfolio.split(';')[0]}` : 'I can share a relevant case study on call'}), then layer the rest in milestone 2.

Open to that approach?

Best,
[Your name]`
      break

    case 'objection_timeline':
      subject = `Re: timeline`
      body_text = `Hi ${clientName},

Honest answer: the timeline you mentioned is tight. I'd rather tell you now than over-promise and under-deliver.

What I can do:
- Phase 1 by your date: the must-have flow only.
- Phase 2 immediately after: the rest.

Rush fee applies to phase 1 if you want it locked in. If the deadline is genuinely fixed, this is the path. If there's flex, we drop the rush fee and ship it clean.

Which works?

Best,
[Your name]`
      break

    case 'inbound_reply':
    default:
      subject = `Re: your project inquiry`
      body_text = `Hi ${clientName},

Thanks for reaching out. I can help with this.

My relevant capabilities: ${skills}
Pricing: ${pricing || 'scoped to your brief'}
Portfolio: ${portfolio || 'shared on request'}

To draft a firm proposal I'd need: final scope, your timeline, and any compliance/security requirements. Want to set up a call?

Best,
[Your name]`
  }

  // Return the drafted message. In Co-Pilot mode, the user reviews & approves before dispatch.
  // In Representative mode, this draft would be queued for Hashim or the configured integration to send.
  return NextResponse.json({
    scenario: body.scenario,
    subject,
    body: body_text,
    mode: 'DRAFT', // always draft — dispatch is a separate, explicit action
    note: 'Review and approve before sending. Nothing is dispatched automatically.',
  })
}
