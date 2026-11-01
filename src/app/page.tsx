'use client'

import { useEffect, useState } from 'react'
import { LandingView } from '@/components/habibi/LandingView'
import { SignupView } from '@/components/habibi/SignupView'
import { LoginView } from '@/components/habibi/LoginView'
import { DashboardView } from '@/components/habibi/DashboardView'
import type { SessionUserDTO, View } from '@/components/habibi/types'

export default function Home() {
  const [view, setView] = useState<View>('landing')
  const [user, setUser] = useState<SessionUserDTO | null>(null)
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null)
  const [booted, setBooted] = useState(false)

  // On mount, check if there's an active session
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user)
          setView('dashboard')
          // For returning users we don't have the passphrase, so vault stays locked
          // until they re-enter it via the login flow. For v1, we treat session-only
          // logins as "Tier 1 only" — vault requires explicit passphrase entry.
          // A future passkey+PRF upgrade would let us re-derive without passphrase.
        }
        setBooted(true)
      })
      .catch(() => setBooted(true))
  }, [])

  function handleSignup(u: SessionUserDTO, key: CryptoKey) {
    setUser(u)
    setVaultKey(key)
    setView('dashboard')
  }

  function handleLogin(u: SessionUserDTO, key: CryptoKey) {
    setUser(u)
    setVaultKey(key)
    setView('dashboard')
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setVaultKey(null)
    setView('landing')
  }

  if (!booted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-500 text-sm">Loading…</div>
      </div>
    )
  }

  if (view === 'dashboard' && user) {
    // If vault key is not set (returning user via session cookie),
    // show a "unlock vault" prompt before dashboard.
    if (!vaultKey) {
      return (
        <LoginView
          onBack={handleLogout}
          onLoggedIn={handleLogin}
        />
      )
    }
    return (
      <DashboardView
        user={user}
        vaultKey={vaultKey}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'signup') {
    return (
      <SignupView
        onBack={() => setView('landing')}
        onSignedUp={handleSignup}
      />
    )
  }

  if (view === 'login') {
    return (
      <LoginView
        onBack={() => setView('landing')}
        onLoggedIn={handleLogin}
      />
    )
  }

  return (
    <LandingView
      onSignup={() => setView('signup')}
      onLogin={() => setView('login')}
    />
  )
}
