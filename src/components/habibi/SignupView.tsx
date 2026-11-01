'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import {
  deriveVaultKey,
  deriveAuthVerifier,
  deriveRecoveryKey,
  encryptVaultKeyForRecovery,
  generateVaultSalt,
  generateRecoverySalt,
  generateAuthSalt,
  generateRecoveryCode,
} from '@/lib/crypto-client'
import type { SessionUserDTO } from './types'

interface Props {
  onBack: () => void
  onSignedUp: (user: SessionUserDTO, vaultKey: CryptoKey) => void
}

export function SignupView({ onBack, onSignedUp }: Props) {
  const [email, setEmail] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [passphrase2, setPassphrase2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [pendingVaultKey, setPendingVaultKey] = useState<CryptoKey | null>(null)
  const [pendingUser, setPendingUser] = useState<SessionUserDTO | null>(null)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email || !passphrase) {
      setError('Email and passphrase are required.')
      return
    }
    if (passphrase.length < 12) {
      setError('Passphrase must be at least 12 characters. This protects your entire vault.')
      return
    }
    if (passphrase !== passphrase2) {
      setError('Passphrases do not match.')
      return
    }

    setBusy(true)
    try {
      const authSalt = generateAuthSalt()
      const vaultSalt = generateVaultSalt()
      const recoverySalt = generateRecoverySalt()

      const code = generateRecoveryCode()
      setRecoveryCode(code)

      const authVerifier = await deriveAuthVerifier(passphrase, authSalt)
      const vaultKey = await deriveVaultKey(passphrase, vaultSalt)
      const recoveryKey = await deriveRecoveryKey(code, recoverySalt)
      const vaultKeyBlob = await encryptVaultKeyForRecovery(vaultKey, recoveryKey)

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          authSalt,
          authVerifier,
          vaultSalt,
          recoverySalt,
          vaultKeyBlob,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Signup failed.')
        setBusy(false)
        return
      }
      const data = await res.json()
      setPendingUser(data.user)
      setPendingVaultKey(vaultKey)
    } catch (e) {
      console.error(e)
      setError('Crypto or network error during signup.')
      setBusy(false)
    }
  }

  function handleAcknowledged() {
    if (pendingUser && pendingVaultKey) {
      onSignedUp(pendingUser, pendingVaultKey)
    }
  }

  if (recoveryCode) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-6 py-12">
        <div className="cosmic-bg" />
        <div className="cosmic-grain" />
        <Card className="w-full max-w-lg border-stone-300 shadow-md relative z-10 rounded-none">
          <CardHeader className="text-center">
            <div className="font-serif text-accent text-xs uppercase tracking-[0.2em] mb-2">One-time display</div>
            <CardTitle className="font-serif text-3xl text-foreground">Save your recovery code</CardTitle>
            <CardDescription className="text-stone-700 max-w-sm mx-auto">
              This is the <strong>only</strong> way to recover your vault if you lose your passphrase.
              We do not have it. Lose this and your vault is gone forever.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-stone-900 text-stone-50 p-6 text-center">
              <code className="font-mono text-xl tracking-[0.15em] select-all block">
                {recoveryCode}
              </code>
            </div>
            <p className="text-sm text-stone-700 text-center">
              Write it down. Print it. Store it in a password manager. Do not lose it.
              The code is shown <strong>only this once</strong>.
            </p>
            <RecoveryCheckbox onAcknowledge={handleAcknowledged} />
          </CardContent>
        </Card>
      </div>
    )
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
            <div className="font-serif text-accent text-xs uppercase tracking-[0.2em] mb-2">Create your vault</div>
            <CardTitle className="font-serif text-3xl text-foreground">Sign up</CardTitle>
            <CardDescription className="text-stone-700">
              Your passphrase encrypts your entire vault. We never see it.
              Lose it and your only recovery path is the backup code we&apos;ll show you next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
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
                  placeholder="At least 12 characters"
                  required
                  autoComplete="new-password"
                  className="rounded-none"
                />
                <p className="text-xs text-stone-500">
                  This single passphrase encrypts your vault. We store only a verifier — never the passphrase itself.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pp2">Confirm passphrase</Label>
                <Input
                  id="pp2"
                  type="password"
                  value={passphrase2}
                  onChange={(e) => setPassphrase2(e.target.value)}
                  placeholder="Type it again"
                  required
                  autoComplete="new-password"
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
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating crypto…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" /> Create vault
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RecoveryCheckbox({ onAcknowledge }: { onAcknowledge: () => void }) {
  const [saved, setSaved] = useState(false)
  return (
    <>
      <label className="flex items-start gap-2 text-sm text-stone-700 justify-center">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-0.5"
        />
        <span>I have saved this recovery code in a secure location.</span>
      </label>
      <Button
        disabled={!saved}
        onClick={onAcknowledge}
        className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-none"
      >
        Continue to dashboard →
      </Button>
    </>
  )
}
