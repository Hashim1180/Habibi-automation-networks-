import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import ZAI from 'z-ai-web-dev-sdk'

/**
 * POST /api/guide/chat
 * Body: {
 *   messages: [{ role: 'user'|'assistant', content }],
 *   decryptedVault?: { skills, pricing, portfolio, notes } // optional, sent from browser if user authorizes
 * }
 *
 * The Guide AI is a separate system from the AI Rep:
 *   - AI Rep drafts client-facing outreach (cold emails, replies, objection responses)
 *   - Guide AI helps the USER with strategy: profile improvement, skill gaps, pricing
 *     strategy, response strategy, platform usage, client red flags
 *
 * The Guide AI runs on the z-ai-web-dev-sdk LLM (glm-4.6). If the user authorizes,
 * decrypted vault data is passed in for personalized guidance — same privacy model
 * as the AI Rep: plaintext vault data is in server memory only for the duration of
 * this request, never persisted.
 */

const SYSTEM_PROMPT = `You are the Habibi Guide — a strategic advisor for independent developers, designers, and creators using the Habibi.AI platform.

Your role is DIFFERENT from the AI Rep:
- The AI Rep drafts client-facing outreach (cold emails, replies, objection responses).
- YOU help the user themselves: profile improvement, skill gap analysis, pricing strategy, response strategy, platform usage, identifying client red flags, building a sustainable freelance practice.

Your voice:
- Warm but precise. Brother-to-brother when the user invites it; otherwise professional.
- Honest over flattering. If their pricing floor is too low, say so. If a skill they listed is undifferentiated, say so.
- Concrete over abstract. Give specific examples, specific numbers, specific actions.
- Strategic over tactical when the question is strategic; tactical when the question is tactical.

Hard rules:
- Never promise outcomes ("you'll definitely close this deal"). Promise process and probability.
- Never advise the user to lie, misrepresent skills, or violate a platform's ToS.
- Never recommend scraping Instagram, LinkedIn, Fiverr, or Upwork. If asked, explain why and offer legitimate alternatives.
- If the user invokes faith or cultural warmth, respond with genuine integrity — but do NOT let it soften your honest assessment. Warmth without honesty is flattery.
- If you don't know something (current market rates in a specific niche, the user's actual portfolio quality), say so rather than inventing.

Output format:
- Keep responses tight: 3-6 short paragraphs max, unless the user explicitly asks for depth.
- Use plain prose. Bullet points only when listing concrete actions.
- End with one specific next action the user can take in the next 24 hours.

If the user's decrypted vault is provided, ground your guidance in their actual skills, pricing, and portfolio. If not provided, give general guidance and note that personalized advice requires unlocking their vault.`

interface GuideMessage {
  role: 'user' | 'assistant'
  content: string
}

interface DecryptedVaultContext {
  skills: { label: string; value: string }[]
  pricing: { label: string; value: string }[]
  portfolio: { label: string; value: string }[]
  notes: { label: string; value: string }[]
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { messages, decryptedVault } = body as {
    messages: GuideMessage[]
    decryptedVault?: DecryptedVaultContext
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array required' }, { status: 400 })
  }

  // Build the system prompt with optional vault context
  let systemContent = SYSTEM_PROMPT
  if (decryptedVault) {
    const skills = decryptedVault.skills.map((s) => `${s.label}: ${s.value}`).join('\n  - ')
    const pricing = decryptedVault.pricing.map((p) => `${p.label}: ${p.value}`).join('\n  - ')
    const portfolio = decryptedVault.portfolio.map((p) => `${p.label}: ${p.value}`).join('\n  - ')
    const notes = decryptedVault.notes.map((n) => `${n.label}: ${n.value}`).join('\n  - ')
    systemContent += `\n\n=== USER'S DECRYPTED VAULT (in-memory only, not persisted) ===
Skills:
  - ${skills || '(none)'}
Pricing floors:
  - ${pricing || '(none)'}
Portfolio:
  - ${portfolio || '(none)'}
Notes:
  - ${notes || '(none)'}

Ground your guidance in the above. If a skill listed is commodity (e.g. generic "React" with no specialization), call out the need to differentiate. If pricing floor is missing or implausibly low, flag it. If portfolio is empty, that's the #1 thing to fix before any outreach.`
  } else {
    systemContent += `\n\n(User has not authorized vault access for this query. Give general guidance and note that unlocking the vault would enable personalized advice.)`
  }

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      model: 'glm-4.6',
      messages: [
        { role: 'system', content: systemContent },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      thinking: { type: 'disabled' },
    })

    const reply =
      completion?.choices?.[0]?.message?.content ||
      completion?.choices?.[0]?.delta?.content ||
      '(no response from model)'

    return NextResponse.json({
      reply,
      usage: completion?.usage,
    })
  } catch (e) {
    console.error('[guide/chat] LLM error', e)
    return NextResponse.json(
      {
        error: 'Guide AI failed to respond. Try again in a moment.',
        detail: String(e),
      },
      { status: 500 },
    )
  }
}
