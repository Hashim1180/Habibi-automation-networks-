'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { User, Save, Loader2, CheckCircle2 } from 'lucide-react'
import type { ProfileDTO } from './types'

export function ProfileForm() {
  const [profile, setProfile] = useState<ProfileDTO | null>(null)
  const [name, setName] = useState('')
  const [contactMethod, setContactMethod] = useState('email')
  const [contactValue, setContactValue] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      fetch('/api/profile')
        .then((r) => r.json())
        .then((data) => {
          if (data.profile) {
            setProfile(data.profile)
            setName(data.profile.name || '')
            setContactMethod(data.profile.contactMethod || 'email')
            setContactValue(data.profile.contactValue || '')
            setFeedback(data.profile.feedback || '')
          }
        })
        .catch(() => {})
    }, 0)
    return () => clearTimeout(id)
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contactMethod, contactValue, feedback }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Save failed.')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch (e) {
      setError('Network error.')
    }
    setBusy(false)
  }

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-amber-700" />
          <span className="text-xs uppercase tracking-wide text-stone-500">Tier 1 — Operator-readable</span>
        </div>
        <CardTitle className="font-serif text-xl text-stone-900">Your profile</CardTitle>
        <CardDescription>
          This is the only personal information Hashim (the operator) can see.
          Enough to talk to you. Nothing more.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How Hashim should address you"
            />
          </div>

          <div className="space-y-2">
            <Label>How can Hashim reach you?</Label>
            <RadioGroup
              value={contactMethod}
              onValueChange={setContactMethod}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="email" id="cm-email" />
                <Label htmlFor="cm-email" className="font-normal cursor-pointer">Email</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="phone" id="cm-phone" />
                <Label htmlFor="cm-phone" className="font-normal cursor-pointer">Phone</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="whatsapp" id="cm-wa" />
                <Label htmlFor="cm-wa" className="font-normal cursor-pointer">WhatsApp</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cv">Contact ({contactMethod})</Label>
            <Input
              id="cv"
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder={
                contactMethod === 'email'
                  ? 'you@domain.com'
                  : contactMethod === 'whatsapp'
                  ? '+971 50 123 4567'
                  : '+971 50 123 4567'
              }
            />
            <p className="text-xs text-stone-500">
              Hashim uses this to talk to you directly about your account, deals, or concerns.
              He handles billing and misuse resolution off-platform via this channel.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback (optional)</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Anything you want Hashim to know about your experience, feature requests, or concerns. Optional."
              rows={4}
            />
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={busy}
              className="bg-amber-700 hover:bg-amber-800 text-amber-50"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Save profile
                </>
              )}
            </Button>
            {saved && (
              <span className="text-sm text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
