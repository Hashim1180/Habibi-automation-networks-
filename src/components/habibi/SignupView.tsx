'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
      // 1. Generate salts (one for auth, one for vault, one for recovery)
      const authSalt = generateAuthSalt()
      const vaultSalt = generateVaultSalt()
      const recoverySalt = generateRecoverySalt()

      // 2. Generate the recovery code (Option B — shown once)
      const code = generateRecoveryCode()
      setRecoveryCode(code)

      // 3. Derive auth verifier (sent to server — server compares for login)
      const authVerifier = await deriveAuthVerifier(passphrase, authSalt)

      // 4. Derive vault key (stays in browser, encrypts vault entries)
      const vaultKey = await deriveVaultKey(passphrase, vaultSalt)

      // 5. Derive recovery key from recovery code + recoverySalt
      const recoveryKey = await deriveRecoveryKey(code, recoverySalt)

      // 6. Encrypt the vault key with the recovery key → blob stored on server
      //    If user loses passphrase, they enter recovery code → vault key recovered.
      const vaultKeyBlob = await encryptVaultKeyForRecovery(vaultKey, recoveryKey)

      // 7. POST to /api/auth/signup — passphrase NEVER sent
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
      // Stash user + vault key for the post-acknowledgment handoff
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
      <RecoveryCodeDisplay
        code={recoveryCode}
        onAcknowledge={handleAcknowledged}
      />
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-stone-50">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4 text-stone-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="border-stone-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-amber-700" />
              <span className="text-xs uppercase tracking-wide text-stone-500">Create your vault</span>
            </div>
            <CardTitle className="font-serif text-2xl text-stone-900">Sign up</CardTitle>
            <CardDescription className="text-stone-600">
              Your passphrase encrypts your entire vault. We never see it.
              Lose it and your only recovery path is the backup code we'll show you next.
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
                />
              </div>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-amber-700 hover:bg-amber-800 text-amber-50"
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

function RecoveryCodeDisplay({ code, onAcknowledge }: { code: string; onAcknowledge: () => void }) {
  const [saved, setSaved] = useState(false)
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-stone-50">
      <Card className="w-full max-w-lg border-amber-300 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-amber-700" />
            <span className="text-xs uppercase tracking-wide text-amber-700">One-time display</span>
          </div>
          <CardTitle className="font-serif text-2xl text-stone-900">Save your recovery code</CardTitle>
          <CardDescription>
            This is the <strong>only</strong> way to recover your vault if you lose your passphrase.
            We do not have it. There is no other recovery path. Lose this and your vault is gone forever.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
            <code className="block text-center text-xl font-mono text-amber-900 tracking-wider select-all">
              {code}
            </code>
          </div>
          <p className="text-sm text-stone-600">
            Write it down. Print it. Store it in a password manager. Do not lose it.
            The code is shown <strong>only this once</strong>.
          </p>
          <label className="flex items-start gap-2 text-sm text-stone-700">
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
            className="w-full bg-amber-700 hover:bg-amber-800 text-amber-50"
          >
            Continue to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
