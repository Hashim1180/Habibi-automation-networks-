'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Shield, Flag, Loader2, Eye, EyeOff } from 'lucide-react'

interface AdminUser {
  id: string
  email: string | null
  name: string | null
  contactMethod: string
  contactValue: string | null
  feedback: string | null
  tier: string
  status: string
  createdAt: string
  vault: {
    entryCount: number
    entryTypes: string[]
    labels: { type: string; label: string; updatedAt: string }[]
  }
  openFlags: { id: string; reason: string; severity: string }[]
}

export function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [flagModal, setFlagModal] = useState<{ userId: string; name: string } | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to load admin data.')
      } else {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch {
      setError('Network error.')
    }
    setLoading(false)
  }

  useEffect(() => {
    const id = setTimeout(() => load(), 0)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-amber-700" />
            <span className="text-xs uppercase tracking-wide text-stone-500">Operator view — Hashim only</span>
          </div>
          <CardTitle className="font-serif text-xl text-stone-900">Admin panel</CardTitle>
          <CardDescription>
            Tier 1 data + vault structure for each user. You see names, contacts, feedback, and
            <strong> how many entries</strong> they have — but never what's inside.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-sm text-stone-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
            </div>
          )}
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-3">
              {error}
            </div>
          )}

          {!loading && users.length === 0 && (
            <p className="text-sm text-stone-500">No users yet.</p>
          )}

          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="rounded-md border border-stone-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-900 truncate">
                      {u.name || <span className="italic text-stone-500">no name</span>}
                      <span className="ml-2 text-xs text-stone-500">({u.email})</span>
                    </div>
                    <div className="text-xs text-stone-600 mt-1">
                      Contact: <span className="font-medium">{u.contactMethod}</span>{' '}
                      {u.contactValue || <span className="italic">— not set</span>}
                    </div>
                    <div className="text-xs text-stone-500 mt-1">
                      Joined {new Date(u.createdAt).toLocaleDateString()} · Tier: {u.tier} · Status: {u.status}
                    </div>
                    <div className="text-xs text-stone-600 mt-1">
                      Vault: {u.vault.entryCount} entries across {u.vault.entryTypes.join(', ') || 'no types'}
                      {u.openFlags.length > 0 && (
                        <span className="ml-2 text-red-600 font-medium">
                          · {u.openFlags.length} open flag{u.openFlags.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                    >
                      {expanded === u.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setFlagModal({ userId: u.id, name: u.name || u.email || 'user' })}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Flag className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {expanded === u.id && (
                  <div className="mt-3 pt-3 border-t border-stone-200 space-y-2">
                    <div>
                      <div className="text-xs uppercase text-stone-500 mb-1">Vault labels (encrypted — values hidden from you)</div>
                      <div className="space-y-1">
                        {u.vault.labels.length === 0 ? (
                          <div className="text-xs italic text-stone-400">No entries</div>
                        ) : (
                          u.vault.labels.map((l, i) => (
                            <div key={i} className="text-xs text-stone-700 flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">{l.type}</span>
                              <span>{l.label}</span>
                              <span className="text-stone-400 ml-auto">
                                updated {new Date(l.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {u.feedback && (
                      <div>
                        <div className="text-xs uppercase text-stone-500 mb-1">User feedback</div>
                        <div className="text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded p-2">
                          {u.feedback}
                        </div>
                      </div>
                    )}

                    {u.openFlags.length > 0 && (
                      <div>
                        <div className="text-xs uppercase text-stone-500 mb-1">Open flags</div>
                        <div className="space-y-1">
                          {u.openFlags.map((f) => (
                            <div key={f.id} className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                              <span className="font-medium">{f.severity}</span> · {f.reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {flagModal && (
        <FlagModal
          userName={flagModal.name}
          onCancel={() => setFlagModal(null)}
          onSubmit={async (reason, severity, context) => {
            await fetch('/api/admin/flags', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: flagModal.userId,
                reason,
                severity,
                context,
              }),
            })
            setFlagModal(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function FlagModal({
  userName,
  onCancel,
  onSubmit,
}: {
  userName: string
  onCancel: () => void
  onSubmit: (reason: string, severity: string, context: string) => Promise<void>
}) {
  const [reason, setReason] = useState('manual_review')
  const [severity, setSeverity] = useState('LOW')
  const [context, setContext] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-serif text-lg">Flag {userName} for review</CardTitle>
          <CardDescription>
            This adds a flag to the user's record for you to handle personally.
            The user is not automatically locked — you contact them directly per your off-platform process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="reason">Reason</Label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-stone-300 p-2 text-sm"
            >
              <option value="manual_review">Manual review</option>
              <option value="spam_outreach">Spam outreach</option>
              <option value="fraud_signal">Fraud signal</option>
              <option value="tos_violation">ToS violation</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sev">Severity</Label>
            <select
              id="sev"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full rounded-md border border-stone-300 p-2 text-sm"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ctx">Context (optional)</Label>
            <Textarea
              id="ctx"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              placeholder="What did you observe? This stays private to you."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button
              onClick={async () => {
                setBusy(true)
                await onSubmit(reason, severity, context)
                setBusy(false)
              }}
              disabled={busy}
              className="bg-red-700 hover:bg-red-800 text-red-50"
            >
              {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Flag className="w-3 h-3 mr-1" />}
              File flag
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
