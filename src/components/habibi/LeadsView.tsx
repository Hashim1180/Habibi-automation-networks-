'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExternalLink, RefreshCw, Loader2, MessageSquare } from 'lucide-react'
import type { LeadDTO, DraftResponse, DecryptedVaultPayload, VaultEntryDTO } from './types'
import { decryptVaultEntry } from '@/lib/crypto-client'

interface Props {
  vaultKey: CryptoKey
  // vaultEntries prop is now optional — we fetch our own copy to avoid stale state
  vaultEntries?: VaultEntryDTO[]
}

export function LeadsView({ vaultKey }: Props) {
  const [leads, setLeads] = useState<LeadDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<LeadDTO | null>(null)
  const [draft, setDraft] = useState<DraftResponse | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [vaultEntries, setVaultEntries] = useState<VaultEntryDTO[]>([])

  // Fetch our own vault entries so the draft always sees fresh data
  useEffect(() => {
    const id = setTimeout(() => {
      fetch('/api/vault')
        .then((r) => r.json())
        .then((d) => setVaultEntries(d.entries || []))
        .catch(() => {})
    }, 0)
    return () => clearTimeout(id)
  }, [])

  async function fetchLeads() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sources/hn')
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setLeads(data.leads || [])
      }
    } catch {
      setError('Failed to fetch leads.')
    }
    setLoading(false)
  }

  useEffect(() => {
    const id = setTimeout(() => fetchLeads(), 0)
    return () => clearTimeout(id)
  }, [])

  async function generateDraft(scenario: string) {
    if (!selectedLead) return
    setDrafting(true)
    setDraft(null)

    // Decrypt vault entries in-browser and pass the plaintext to the AI rep endpoint
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
      apikey: 'notes', // api keys go into notes for AI rep templating
    }
    for (const e of vaultEntries) {
      if (!e.ciphertext || !e.iv) continue
      try {
        const value = await decryptVaultEntry(vaultKey, { ciphertext: e.ciphertext, iv: e.iv })
        const bucketKey = ENTRY_TYPE_TO_BUCKET[e.entryType] || 'notes'
        decrypted[bucketKey].push({ label: e.label, value })
      } catch (err) {
        console.error('[generateDraft] decrypt failed for', e.id, err)
      }
    }

    const res = await fetch('/api/rep/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario,
        clientContext: {
          name: selectedLead.author || 'there',
          projectBrief: selectedLead.title,
        },
        clientMessage: selectedLead.body,
        decryptedVault: decrypted,
      }),
    })
    const data = await res.json()
    setDraft(data)
    setDrafting(false)
  }

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <ExternalLink className="w-4 h-4 text-amber-700" />
            <span className="text-xs uppercase tracking-wide text-stone-500">Layer 2 — Free source aggregation</span>
          </div>
          <CardTitle className="font-serif text-xl text-stone-900">Live lead feed</CardTitle>
          <CardDescription>
            Hacker News &quot;Who is hiring?&quot; — free, ToS-compliant.
            More sources (GitHub, Mastodon, Bluesky, RSS) wire in here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Button
              onClick={fetchLeads}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-stone-300"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Fetching…
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </>
              )}
            </Button>
            <span className="text-xs text-stone-500">{leads.length} leads from HN</span>
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-3">
              {error}
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {leads.map((lead) => (
              <button
                key={lead.externalId}
                onClick={() => {
                  setSelectedLead(lead)
                  setDraft(null)
                }}
                className={`block w-full text-left rounded-md border p-3 transition ${
                  selectedLead?.externalId === lead.externalId
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="text-sm font-medium text-stone-900 line-clamp-2">{lead.title}</div>
                <div className="text-xs text-stone-600 line-clamp-2 mt-1">{lead.body}</div>
                <div className="text-xs text-stone-400 mt-1">
                  by {lead.author || 'unknown'} · {new Date(lead.postedAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedLead && (
        <Card className="border-amber-300">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-amber-700" />
              <span className="text-xs uppercase tracking-wide text-stone-500">AI representative draft</span>
            </div>
            <CardTitle className="font-serif text-xl text-stone-900">Draft outreach</CardTitle>
            <CardDescription>
              Uses your decrypted vault (in-browser) — the AI works from your real verified skills, pricing, and portfolio.
              Nothing is dispatched automatically. You approve before send.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-stone-50 border border-stone-200 p-3">
              <div className="text-xs text-stone-500 mb-1">Selected lead:</div>
              <div className="text-sm font-medium text-stone-900">{selectedLead.title}</div>
              <a
                href={selectedLead.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-700 hover:underline mt-1 inline-flex items-center gap-1"
              >
                View original <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => generateDraft('outbound_cold')} disabled={drafting} className="bg-amber-700 hover:bg-amber-800 text-amber-50">
                Cold outreach
              </Button>
              <Button size="sm" variant="outline" onClick={() => generateDraft('inbound_reply')} disabled={drafting} className="border-stone-300">
                Inbound reply
              </Button>
              <Button size="sm" variant="outline" onClick={() => generateDraft('objection_price')} disabled={drafting} className="border-stone-300">
                Price pushback
              </Button>
              <Button size="sm" variant="outline" onClick={() => generateDraft('objection_timeline')} disabled={drafting} className="border-stone-300">
                Timeline pressure
              </Button>
            </div>

            {drafting && (
              <div className="text-sm text-stone-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Drafting…
              </div>
            )}

            {draft && (
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-stone-500 mb-1">Subject:</div>
                  <div className="rounded-md bg-white border border-stone-200 p-2 text-sm font-medium text-stone-900">
                    {draft.subject}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-stone-500 mb-1">Body:</div>
                  <pre className="rounded-md bg-white border border-stone-200 p-3 text-sm text-stone-700 whitespace-pre-wrap font-sans">
                    {draft.body}
                  </pre>
                </div>
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  {draft.note}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
