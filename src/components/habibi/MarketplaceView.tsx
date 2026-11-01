'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Megaphone, Loader2, CheckCircle2 } from 'lucide-react'

export function MarketplaceView() {
  const [clientName, setClientName] = useState('')
  const [clientContact, setClientContact] = useState('')
  const [brief, setBrief] = useState('')
  const [budget, setBudget] = useState('')
  const [timeline, setTimeline] = useState('')
  const [requiredSkills, setRequiredSkills] = useState('')
  const [busy, setBusy] = useState(false)
  const [posted, setPosted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<any[]>([])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientContact || !brief) {
      setError('Contact and brief are required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientContact,
          brief,
          budget,
          timeline,
          requiredSkills,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Submit failed.')
      } else {
        setPosted(true)
        setClientName('')
        setClientContact('')
        setBrief('')
        setBudget('')
        setTimeline('')
        setRequiredSkills('')
        setTimeout(() => setPosted(false), 3000)
      }
    } catch {
      setError('Network error.')
    }
    setBusy(false)
  }

  async function loadPosts() {
    const res = await fetch('/api/marketplace')
    const data = await res.json()
    setPosts(data.posts || [])
  }

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-4 h-4 text-amber-700" />
            <span className="text-xs uppercase tracking-wide text-stone-500">Layer 1 — Inbound marketplace</span>
          </div>
          <CardTitle className="font-serif text-xl text-stone-900">Submit a project brief</CardTitle>
          <CardDescription>
            Clients post what they need. The AI matches briefs against creators&apos; decrypted vaults
            (when a creator authorizes the match through their live session). Hashim handles the introduction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cn">Your name</Label>
                <Input id="cn" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Optional but preferred" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cc">How can we reach you?</Label>
                <Input id="cc" value={clientContact} onChange={(e) => setClientContact(e.target.value)} placeholder="Email or WhatsApp" required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="brief">Project brief</Label>
              <Textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={4}
                placeholder="What do you need built? Be specific."
                required
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="b">Budget</Label>
                <Input id="b" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. $5,000-$10,000" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="t">Timeline</Label>
                <Input id="t" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. 4 weeks" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="s">Required skills</Label>
                <Input id="s" value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)} placeholder="comma-separated" />
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={busy} className="bg-amber-700 hover:bg-amber-800 text-amber-50">
                {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Submit brief
              </Button>
              {posted && (
                <span className="text-sm text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Brief submitted. Hashim will be in touch.
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="font-serif text-base">Open briefs</CardTitle>
          <CardDescription>Visible to creators who may match. Client contact shown only to matched creators.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={loadPosts} className="border-stone-300 mb-3">
            Load open briefs
          </Button>
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className="rounded-md border border-stone-200 bg-white p-3">
                <div className="text-sm font-medium text-stone-900">{p.brief.slice(0, 200)}</div>
                <div className="text-xs text-stone-500 mt-1">
                  {p.requiredSkills && <span>Skills: {p.requiredSkills} · </span>}
                  {p.budget && <span>Budget: {p.budget} · </span>}
                  {p.timeline && <span>Timeline: {p.timeline} · </span>}
                  Posted {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {posts.length === 0 && (
              <p className="text-sm text-stone-500">Click &quot;Load open briefs&quot; to see what&apos;s been posted.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
