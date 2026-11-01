'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Shield, Flag, Loader2, Eye, EyeOff, Wallet, Check, X } from 'lucide-react'

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

interface AdminWithdrawal {
  id: string
  grossUsd: string
  feeUsd: string
  netUsd: string
  feePercent: string
  isEarlyAdopter: boolean
  methodType: string
  methodLabel: string
  status: string
  adminNotes: string | null
  createdAt: string
  processedAt: string | null
  user: {
    email: string | null
    name: string | null
    contactMethod: string
    contactValue: string | null
  } | null
}

export function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [flagModal, setFlagModal] = useState<{ userId: string; name: string } | null>(null)

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to load admin data.')
        return
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      setError('Network error.')
    }
  }

  async function loadWithdrawals() {
    try {
      const res = await fetch('/api/admin/withdrawals')
      if (res.ok) {
        const data = await res.json()
        setWithdrawals(data.requests || [])
      }
    } catch {}
  }

  useEffect(() => {
    const id = setTimeout(() => {
      Promise.all([loadUsers(), loadWithdrawals()]).finally(() => setLoading(false))
    }, 0)
    return () => clearTimeout(id)
  }, [])

  async function actOnWithdrawal(id: string, action: 'approve' | 'reject' | 'mark_paid' | 'mark_failed', notes?: string) {
    const res = await fetch(`/api/admin/withdrawals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    })
    if (res.ok) {
      await loadWithdrawals()
    }
  }

  return (
    <div className="space-y-6">
      {/* Pending withdrawals */}
      <Card className="border-stone-300">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-accent" />
            <span className="text-xs uppercase tracking-wide text-stone-500">Withdrawal queue · requires manual fulfillment</span>
          </div>
          <CardTitle className="font-serif text-xl text-foreground">Pending withdrawals</CardTitle>
          <CardDescription>
            Each request shows the user&apos;s locked fee rate (28% or 35%), gross amount, your cut, and net payout.
            <strong> Contact the user via their registered method to confirm payout details, then approve.</strong>
            The full method details are in their encrypted vault — you see only the label.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-stone-500 py-4">No pending withdrawal requests.</p>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div key={w.id} className="rounded border border-stone-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">
                        {w.user?.name || w.user?.email || 'Unknown user'}
                        <span className="ml-2 text-xs text-stone-500">({w.user?.email})</span>
                        {w.isEarlyAdopter && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded uppercase tracking-wide">
                            Early Adopter
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-600 mt-1">
                        Contact: <strong>{w.user?.contactMethod}</strong>{' '}
                        {w.user?.contactValue || <em>— not set</em>}
                      </div>
                      <div className="text-xs text-stone-500 mt-1">
                        Method: <strong className="text-foreground">{w.methodLabel}</strong>{' '}
                        <span className="text-stone-400">({w.methodType})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                        <div className="bg-stone-50 p-2 rounded">
                          <div className="text-[10px] uppercase tracking-wide text-stone-500">Gross</div>
                          <div className="font-mono">${w.grossUsd}</div>
                        </div>
                        <div className="bg-amber-50 p-2 rounded">
                          <div className="text-[10px] uppercase tracking-wide text-amber-700">Your cut ({w.feePercent})</div>
                          <div className="font-mono text-amber-900">${w.feeUsd}</div>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded">
                          <div className="text-[10px] uppercase tracking-wide text-emerald-700">User receives</div>
                          <div className="font-mono text-emerald-900">${w.netUsd}</div>
                        </div>
                      </div>
                      <div className="text-xs text-stone-500 mt-2">
                        Requested {new Date(w.createdAt).toLocaleString()} · Status: <strong>{w.status}</strong>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {w.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => actOnWithdrawal(w.id, 'approve')}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-none"
                          >
                            <Check className="w-3 h-3 mr-1" /> Approve & deduct
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => actOnWithdrawal(w.id, 'reject', 'Rejected by operator')}
                            className="border-red-300 text-red-700 hover:bg-red-50 rounded-none"
                          >
                            <X className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {w.status === 'APPROVED' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => actOnWithdrawal(w.id, 'mark_paid')}
                            className="bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-none"
                          >
                            <Check className="w-3 h-3 mr-1" /> Mark paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => actOnWithdrawal(w.id, 'mark_failed', 'Payout failed')}
                            className="border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none"
                          >
                            Mark failed
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card className="border-stone-200">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-amber-700" />
            <span className="text-xs uppercase tracking-wide text-stone-500">Operator view — Hashim only</span>
          </div>
          <CardTitle className="font-serif text-xl text-stone-900">Users</CardTitle>
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
