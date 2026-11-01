'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, LogIn, Loader2 } from 'lucide-react'
import { deriveAuthVerifier, deriveVaultKey } from '@/lib/crypto-client'
import type { SessionUserDTO } from './types'

interface Props {
  onBack: () => void
  onLoggedIn: (user: SessionUserDTO, vaultKey: CryptoKey) => void
}

export function LoginView({ onBack, onLoggedIn }: Props) {
  const [email, setEmail] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !passphrase) {
      setError('Email and passphrase are required.')
      return
    }
    setBusy(true)
    try {
      const prepRes = await fetch('/api/auth/login/prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!prepRes.ok) {
        const data = await prepRes.json()
        setError(data.error || 'No account with that email.')
        setBusy(false)
        return
      }
      const prep = await prepRes.json()
      const { authSalt, vaultSalt } = prep

      const authVerifier = await deriveAuthVerifier(passphrase, authSalt)
      const verifyRes = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, authVerifier }),
      })
      if (!verifyRes.ok) {
        const data = await verifyRes.json()
        setError(data.error || 'Invalid credentials.')
        setBusy(false)
        return
      }
      const data = await verifyRes.json()
      const vaultKey = await deriveVaultKey(passphrase, vaultSalt)
      onLoggedIn(data.user, vaultKey)
    } catch (e) {
      console.error(e)
      setError('Network or crypto error during login.')
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12">
      <div className="cosmic-bg" />
      <div className="cosmic-grain" />
      <div className="w-full max-w-md relative z-10">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 text-stone-600">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="border-stone-300 rounded-none">
          <CardHeader>
            <div className="font-serif text-accent text-xs uppercase tracking-[0.2em] mb-2">Welcome back</div>
            <CardTitle className="font-serif text-3xl text-foreground">Log in</CardTitle>
            <CardDescription className="text-stone-700">
              Type your email and vault passphrase. The passphrase decrypts your vault in your browser — it never leaves this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  required
                  autoComplete="email"
                  className="rounded-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pp">Vault passphrase</Label>
                <Input
                  id="pp"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Your vault passphrase"
                  required
                  autoComplete="current-password"
                  className="rounded-none"
                />
              </div>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-none"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Unlocking vault…
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" /> Log in &amp; unlock vault
                  </>
                )}
              </Button>

              <button
                type="button"
                className="text-xs text-stone-500 hover:text-stone-700 underline editorial-link"
              >
                Lost your passphrase? Use your recovery code.
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
