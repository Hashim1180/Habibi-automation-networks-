'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Send, Loader2, Sparkles, Lock, Unlock, User, Bot } from 'lucide-react'
import { decryptVaultEntry } from '@/lib/crypto-client'
import type { VaultEntryDTO, DecryptedVaultPayload } from './types'

interface Props {
  vaultKey: CryptoKey
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_QUESTIONS = [
  'How should I price my Next.js work for enterprise clients vs startups?',
  'What skills should I add to attract higher-budget clients?',
  'A client said my price is too high. How should I respond?',
  'What red flags should I watch for in client briefs?',
  'How do I build a portfolio if I have no commercial work yet?',
  'What\'s the right cadence for cold outreach without being spammy?',
]

export function GuideAI({ vaultKey }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vaultAuthorized, setVaultAuthorized] = useState(false)
  const [vaultEntries, setVaultEntries] = useState<VaultEntryDTO[]>([])
  const [vaultSummary, setVaultSummary] = useState<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch vault entries (ciphertext) — we only decrypt when user authorizes
  useEffect(() => {
    const id = setTimeout(() => {
      fetch('/api/vault')
        .then((r) => r.json())
        .then((d) => setVaultEntries(d.entries || []))
        .catch(() => {})
    }, 0)
    return () => clearTimeout(id)
  }, [])

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function authorizeVault() {
    // Decrypt all vault entries in-browser, build summary, then send only when user sends a message
    const decrypted: DecryptedVaultPayload = {
      skills: [],
      pricing: [],
      portfolio: [],
      notes: [],
    }
    const ENTRY_TYPE_TO_BUCKET: Record<string, keyof DecryptedVaultPayload> = {
      skill: 'skills',
      pricing: 'pricing',
      portfolio: 'portfolio',
      note: 'notes',
      apikey: 'notes',
    }
    for (const e of vaultEntries) {
      if (!e.ciphertext || !e.iv) continue
      try {
        const value = await decryptVaultEntry(vaultKey, { ciphertext: e.ciphertext, iv: e.iv })
        const bucketKey = ENTRY_TYPE_TO_BUCKET[e.entryType] || 'notes'
        decrypted[bucketKey].push({ label: e.label, value })
      } catch (err) {
        console.error('decrypt failed', err)
      }
    }
    const summary = `${decrypted.skills.length} skills, ${decrypted.pricing.length} pricing floors, ${decrypted.portfolio.length} portfolio items, ${decrypted.notes.length} notes`
    setVaultSummary(summary)
    setVaultAuthorized(true)
  }

  async function send(question?: string) {
    const q = (question || input).trim()
    if (!q || busy) return

    setError(null)
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: q }]
    setMessages(newMessages)
    setInput('')
    setBusy(true)

    try {
      // If user authorized vault, decrypt fresh on each send (in case vault changed)
      let decryptedVault: DecryptedVaultPayload | undefined
      if (vaultAuthorized) {
        decryptedVault = { skills: [], pricing: [], portfolio: [], notes: [] }
        const ENTRY_TYPE_TO_BUCKET: Record<string, keyof DecryptedVaultPayload> = {
          skill: 'skills',
          pricing: 'pricing',
          portfolio: 'portfolio',
          note: 'notes',
          apikey: 'notes',
        }
        for (const e of vaultEntries) {
          if (!e.ciphertext || !e.iv) continue
          try {
            const value = await decryptVaultEntry(vaultKey, { ciphertext: e.ciphertext, iv: e.iv })
            const bucketKey = ENTRY_TYPE_TO_BUCKET[e.entryType] || 'notes'
            decryptedVault[bucketKey].push({ label: e.label, value })
          } catch {}
        }
      }

      const res = await fetch('/api/guide/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          decryptedVault,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Guide failed to respond.')
        setBusy(false)
        return
      }
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setError('Network error.')
    }
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <Card className="border-stone-300">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-xs uppercase tracking-wide text-stone-500">Guide AI · strategic advisor</span>
              </div>
              <CardTitle className="font-serif text-2xl text-foreground">Ask the Guide</CardTitle>
              <CardDescription>
                The Guide helps <em className="font-serif">you</em> — profile, pricing, skill gaps, response strategy, red flags.
                Different from the AI Rep, which drafts client-facing outreach.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant={vaultAuthorized ? 'default' : 'outline'}
              onClick={authorizeVault}
              disabled={vaultAuthorized || vaultEntries.length === 0}
              className={vaultAuthorized ? 'bg-accent text-accent-foreground' : 'border-stone-300'}
            >
              {vaultAuthorized ? (
                <>
                  <Unlock className="w-3 h-3 mr-1" /> Vault linked
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 mr-1" /> Authorize vault
                </>
              )}
            </Button>
          </div>
          {vaultAuthorized && vaultSummary && (
            <div className="text-xs text-stone-600 bg-stone-100 border border-stone-200 rounded px-2 py-1 mt-2">
              Guide can see: {vaultSummary}. Plaintext is in server memory only for the duration of each request — never persisted.
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Chat history */}
          <div
            ref={scrollRef}
            className="chat-scroll max-h-96 overflow-y-auto space-y-3 mb-3 min-h-[120px]"
          >
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-stone-600 mb-4 font-serif italic">
                  What would you like to work on?
                </p>
                <div className="grid sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={busy}
                      className="text-left text-sm px-3 py-2 rounded border border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50 transition disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  m.role === 'user'
                    ? 'bg-stone-200 text-stone-700'
                    : 'bg-accent/10 text-accent border border-accent/30'
                }`}>
                  {m.role === 'user' ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className={`flex-1 max-w-[85%] ${
                  m.role === 'user' ? 'text-right' : ''
                }`}>
                  <div className={`inline-block text-left text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-stone-900 text-stone-50 rounded-lg rounded-tr-none px-3 py-2'
                      : 'bg-white border border-stone-200 rounded-lg rounded-tl-none px-3 py-2 text-stone-800'
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-accent/10 text-accent border border-accent/30">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-stone-200 rounded-lg rounded-tl-none px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-stone-500" />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2 mb-3">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Ask the Guide anything about your freelance practice…"
              rows={2}
              className="resize-none border-stone-300"
            />
            <Button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              className="bg-stone-900 hover:bg-stone-800 text-stone-50"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-stone-500 mt-2">
            Enter to send · Shift+Enter for newline · Guide runs on GLM-4.6
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
