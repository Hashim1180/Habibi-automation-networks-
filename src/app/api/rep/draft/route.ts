import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

/**
 * POST /api/rep/draft
 *
 * Honest AI Representative endpoint.
 *
 * Core change from v1: the AI no longer blindly drafts outreach for any lead.
 * It computes a `fit_score` (0-100) and `fit_assessment`. If fit_score < 30,
 * it REFUSES to generate a draft and explains why. This protects clients from
 * being spammed by unfit creators and protects creators from wasting time on
 * leads they can't win.
 *
 * Also runs `fraud_risk` detection on the lead text — flags scams, upfront
 * payment requests, off-platform pressure, implausible budgets, etc.
 *
 * The decrypted vault data is passed in from the browser (in-memory only,
 * never persisted on server). The server uses it to compute fit and ground
 * the draft in the creator's REAL skills, not invented ones.
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

// ---------- Fraud detection (rule-based heuristic) ----------

interface FraudSignal {
  reason: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  matchedText: string
}

function detectFraudSignals(text: string): FraudSignal[] {
  const signals: FraudSignal[] = []
  const lower = text.toLowerCase()

  // HIGH severity
  if (/western\s*union|money\s*gram|gift\s*card/.test(lower)) {
    signals.push({
      reason: 'Requests payment via Western Union, MoneyGram, or gift cards — classic scam signal.',
      severity: 'HIGH',
      matchedText: text.slice(0, 80),
    })
  }
  if (/send\s+(me\s+)?(money|funds|payment|deposit)\s+(first|upfront|before|in advance|to verify)/.test(lower)) {
    signals.push({
      reason: 'Requests upfront payment before any work — legitimate milestones are paid in arrears.',
      severity: 'HIGH',
      matchedText: text.slice(0, 80),
    })
  }
  if (/\$\d{4,}\s+(for|to|budget).*?(landing|simple|basic|quick)/.test(lower) ||
      /\$\d{5,}\s+(for|to|budget)/.test(lower) && !/milestone|sprint|phase/.test(lower)) {
    signals.push({
      reason: 'Implausibly high budget for vague scope — too-good-to-be-true signal.',
      severity: 'HIGH',
      matchedText: text.slice(0, 80),
    })
  }
  if (/\+?\d[\d\s\-]{8,}/.test(text) && /whatsapp|telegram|signal|off[\s-]?platform/i.test(text)) {
    signals.push({
      reason: 'Phone number + pressure to communicate off-platform in first message.',
      severity: 'HIGH',
      matchedText: text.slice(0, 80),
    })
  }
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text) && /email|contact\s+me\s+(directly|at)/i.test(text)) {
    signals.push({
      reason: 'Email address + pressure to contact directly off-platform in first message.',
      severity: 'MEDIUM',
      matchedText: text.slice(0, 80),
    })
  }

  // MEDIUM severity
  if (/\b(3 days|three days|24 hours|tomorrow|this weekend|asap|urgent)\b/i.test(lower) &&
      /build|develop|complete|deliver/.test(lower)) {
    signals.push({
      reason: 'Unrealistic timeline pressure — common in scam briefs.',
      severity: 'MEDIUM',
      matchedText: text.slice(0, 80),
    })
  }
  if (/crypto|bitcoin|btc|usdt|ether/i.test(lower) && /pay|fund|wallet/i.test(lower)) {
    signals.push({
      reason: 'Requests crypto payment to anonymous wallet — high reversal risk.',
      severity: 'MEDIUM',
      matchedText: text.slice(0, 80),
    })
  }

  return signals
}

// ---------- Fit score calculation ----------

function calculateFitScore(vault: DecryptedVault, lead: DraftRequest): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  const leadText = `${lead.clientContext?.projectBrief || ''} ${lead.clientMessage || ''}`.toLowerCase()

  // 1. Skill match — does the creator have skills mentioned in the lead?
  const skillMatches: string[] = []
  for (const skill of vault.skills) {
    const skillLabel = skill.label.toLowerCase()
    const skillValue = skill.value.toLowerCase()
    // Check if any word in skill label appears in lead text
    const keywords = skillLabel.split(/[\s\/,]+/).filter((k) => k.length > 2)
    for (const kw of keywords) {
      if (leadText.includes(kw)) {
        skillMatches.push(skill.label)
        break
      }
    }
    // Also check skill value (years, specialization keywords)
    if (skillValue.includes('next.js') && leadText.includes('next')) skillMatches.push(skill.label)
    if (skillValue.includes('react') && leadText.includes('react')) skillMatches.push(skill.label)
    if (skillValue.includes('typescript') && leadText.includes('typescript')) skillMatches.push(skill.label)
  }
  if (skillMatches.length > 0) {
    score += Math.min(40, skillMatches.length * 15)
    reasons.push(`Skill match: ${[...new Set(skillMatches)].slice(0, 3).join(', ')}`)
  } else {
    reasons.push('No direct skill match between your vault and the lead brief.')
  }

  // 2. Portfolio presence
  if (vault.portfolio.length > 0) {
    score += 20
    reasons.push(`${vault.portfolio.length} portfolio item(s) — credible for client.`)
  } else {
    reasons.push('No portfolio — clients rarely engage creators with no proof of work.')
  }

  // 3. Pricing floor set
  if (vault.pricing.length > 0) {
    score += 15
    reasons.push('Pricing floor is set — signals professionalism.')
  } else {
    reasons.push('No pricing floor set — client may assume you are desperate or amateur.')
  }

  // 4. Specialization signal
  const allSkillText = vault.skills.map((s) => `${s.label} ${s.value}`).join(' ').toLowerCase()
  if (/edge\s*runtime|server\s*component|web\s*worker|webgl|wasm|graphql|websockets?|streaming|sse/.test(allSkillText)) {
    score += 15
    reasons.push('Has specialized skills beyond commodity "React dev".')
  } else {
    reasons.push('Skills appear commodity — differentiate to score higher.')
  }

  // 5. Years of experience
  for (const skill of vault.skills) {
    const m = skill.value.match(/(\d+)\s*year/i)
    if (m && parseInt(m[1]) >= 3) {
      score += 10
      reasons.push(`${m[1]}+ years of experience documented.`)
      break
    }
  }

  return { score: Math.min(100, score), reasons }
}

// ---------- Draft generation ----------

function generateDraft(
  scenario: string,
  vault: DecryptedVault,
  lead: DraftRequest,
  fitScore: number,
  fitReasons: string[],
): { subject: string; body: string } {
  const skills = vault.skills.map((s) => `${s.label}: ${s.value}`).join('; ')
  const pricing = vault.pricing.map((p) => `${p.label}: ${p.value}`).join('; ')
  const portfolio = vault.portfolio.map((p) => `${p.label}: ${p.value}`).join('; ')

  const clientName = lead.clientContext?.name || 'there'
  const brief = lead.clientContext?.projectBrief || lead.clientMessage || ''
  const topSkills = vault.skills.slice(0, 3).map((s) => s.label).join(', ')

  // The draft EXPLICITLY includes the fit assessment — so the client AND the
  // creator both see an honest evaluation of the match.
  const fitNote = `Fit assessment (score: ${fitScore}/100): ${fitReasons.slice(0, 2).join(' ')}`

  switch (scenario) {
    case 'outbound_cold':
      return {
        subject: `Following up on your project: ${brief.slice(0, 60)}`,
        body: `Hi ${clientName},

I came across your project brief and wanted to reach out — but only because I can honestly say my skills match what you described. Specifically: ${topSkills}.

${fitNote}

What I bring:
${skills}

My pricing: ${pricing || 'happy to discuss based on scope'}.
Selected work: ${portfolio || 'available on request'}.

If your brief has changed or if I misread the fit, just say so — no hard feelings. Otherwise, would you be open to a 15-minute call this week to scope this properly?

Best,
[Your name]`,
      }

    case 'objection_price':
      return {
        subject: `Re: your question on pricing`,
        body: `Hi ${clientName},

Thanks for the candor on the budget. Let me reframe what's included.

The quote reflects custom engineering — not an off-the-shelf template. Specifically:
- Architecture built for your scale (${skills})
- Maintenance and handoff documentation
- Security review

If the full scope is tight, I can phase it as an MVP: we ship the core flow first, then layer the rest in milestone 2.

Open to that approach?

Best,
[Your name]`,
      }

    case 'objection_timeline':
      return {
        subject: `Re: timeline`,
        body: `Hi ${clientName},

Honest answer: the timeline you mentioned is tight. I'd rather tell you now than over-promise and under-deliver.

What I can do:
- Phase 1 by your date: the must-have flow only.
- Phase 2 immediately after: the rest.

Rush fee applies to phase 1 if you want it locked in. If the deadline is genuinely fixed, this is the path. If there's flex, we drop the rush fee and ship it clean.

Which works?

Best,
[Your name]`,
      }

    case 'inbound_reply':
    default:
      return {
        subject: `Re: your project inquiry`,
        body: `Hi ${clientName},

Thanks for reaching out. I can help with this — and I'll be honest about scope.

${fitNote}

My relevant capabilities: ${skills}
Pricing: ${pricing || 'scoped to your brief'}
Portfolio: ${portfolio || 'shared on request'}

To draft a firm proposal I'd need: final scope, your timeline, and any compliance/security requirements. Want to set up a call?

Best,
[Your name]`,
      }
  }
}

// ---------- Main POST handler ----------

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

  // 1. Fraud detection — run on the lead text first
  const leadText = `${body.clientContext?.projectBrief || ''} ${body.clientMessage || ''} ${body.clientContext?.budget || ''} ${body.clientContext?.timeline || ''}`
  const fraudSignals = detectFraudSignals(leadText)
  const fraudRisk = fraudSignals.length > 0
  const highSeverityFraud = fraudSignals.some((s) => s.severity === 'HIGH')

  // 2. If HIGH severity fraud detected, REFUSE to draft
  if (highSeverityFraud) {
    return NextResponse.json({
      fit: false,
      fit_score: 0,
      fit_assessment: 'Draft refused — high-severity fraud signal detected in the lead.',
      fraud_risk: true,
      fraud_signals: fraudSignals,
      draft: null,
      mode: 'REFUSED',
      note: 'The AI Rep will not draft outreach for leads exhibiting high-severity fraud signals. The lead is still visible to you and the operator for review.',
    })
  }

  // 3. Calculate fit score
  const { score: fitScore, reasons: fitReasons } = calculateFitScore(body.decryptedVault, body)

  // 4. If fit score below threshold, REFUSE to draft
  if (fitScore < 30) {
    return NextResponse.json({
      fit: false,
      fit_score: fitScore,
      fit_assessment: `Fit score ${fitScore}/100 is below the 30-point threshold for outreach. The AI Rep will not draft outreach for leads where your skill match is weak — this protects clients from spam and protects your time for leads you can win.`,
      fit_reasons: fitReasons,
      fraud_risk: fraudRisk,
      fraud_signals: fraudSignals,
      draft: null,
      mode: 'REFUSED',
      note: 'Improve your fit by adding more specialized skills, portfolio items, and pricing floors to your vault.',
    })
  }

  // 5. Generate the draft (fit is good enough)
  const { subject, body: draftBody } = generateDraft(
    body.scenario,
    body.decryptedVault,
    body,
    fitScore,
    fitReasons,
  )

  return NextResponse.json({
    fit: true,
    fit_score: fitScore,
    fit_assessment: fitReasons.join(' '),
    fraud_risk: fraudRisk,
    fraud_signals: fraudSignals,
    subject,
    body: draftBody,
    mode: 'DRAFT',
    note: 'Review and approve before sending. The fit assessment above is included in the draft body — the client sees the same honest evaluation you do.',
  })
}
