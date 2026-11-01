'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { LogOut, Shield, User, Lock, Megaphone, Globe, Sparkles } from 'lucide-react'
import type { SessionUserDTO, VaultEntryDTO, DashboardTab } from './types'
import { ProfileForm } from './ProfileForm'
import { VaultEditor } from './VaultEditor'
import { LeadsView } from './LeadsView'
import { AdminPanel } from './AdminPanel'
import { MarketplaceView } from './MarketplaceView'

interface Props {
  user: SessionUserDTO
  vaultKey: CryptoKey
  onLogout: () => void
}

export function DashboardView({ user, vaultKey, onLogout }: Props) {
  const [tab, setTab] = useState<DashboardTab>('profile')
  const [vaultEntries, setVaultEntries] = useState<VaultEntryDTO[]>([])

  useEffect(() => {
    fetch('/api/vault')
      .then((r) => r.json())
      .then((d) => setVaultEntries(d.entries || []))
      .catch(() => {})
  }, [tab === 'vault' ? 'vault' : 'none']) // refresh vault entries when entering vault tab

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-serif text-stone-900">
              Habibi<span className="text-amber-700">.</span>AI
            </div>
            <span className="text-xs text-stone-500 hidden sm:inline">
              Welcome, {user.name || user.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user.role === 'ADMIN' && (
              <Button
                size="sm"
                variant={tab === ('admin' as DashboardTab) ? 'default' : 'ghost'}
                onClick={() => setTab('admin' as DashboardTab)}
                className={tab === ('admin' as DashboardTab) ? 'bg-amber-700 text-amber-50' : 'text-stone-700'}
              >
                <Shield className="w-3 h-3 mr-1" /> Admin
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onLogout} className="text-stone-600">
              <LogOut className="w-3 h-3 mr-1" /> Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6">
        {tab === ('admin' as DashboardTab) && user.role === 'ADMIN' ? (
          <AdminPanel />
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as DashboardTab)}>
            <TabsList className="flex flex-wrap h-auto bg-stone-100 mb-6">
              <TabsTrigger value="profile" className="data-[state=active]:bg-amber-700 data-[state=active]:text-amber-50">
                <User className="w-3 h-3 mr-1" /> Profile
              </TabsTrigger>
              <TabsTrigger value="vault" className="data-[state=active]:bg-amber-700 data-[state=active]:text-amber-50">
                <Lock className="w-3 h-3 mr-1" /> Vault
              </TabsTrigger>
              <TabsTrigger value="leads" className="data-[state=active]:bg-amber-700 data-[state=active]:text-amber-50">
                <Globe className="w-3 h-3 mr-1" /> Leads
              </TabsTrigger>
              <TabsTrigger value="rep" className="data-[state=active]:bg-amber-700 data-[state=active]:text-amber-50">
                <Sparkles className="w-3 h-3 mr-1" /> AI Rep
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="data-[state=active]:bg-amber-700 data-[state=active]:text-amber-50">
                <Megaphone className="w-3 h-3 mr-1" /> Marketplace
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <ProfileForm />
            </TabsContent>

            <TabsContent value="vault">
              <VaultEditor vaultKey={vaultKey} />
            </TabsContent>

            <TabsContent value="leads">
              <LeadsView vaultKey={vaultKey} vaultEntries={vaultEntries} />
            </TabsContent>

            <TabsContent value="rep">
              <LeadsView vaultKey={vaultKey} vaultEntries={vaultEntries} />
            </TabsContent>

            <TabsContent value="marketplace">
              <MarketplaceView />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-stone-50 px-6 py-4">
        <div className="max-w-6xl mx-auto text-xs text-stone-500 flex flex-wrap items-center justify-between gap-2">
          <span>Operator: Hashim · Billing handled off-platform · Misuse handled personally by Hashim</span>
          <span>Tier: {user.tier} · Status: {user.status}</span>
        </div>
      </footer>
    </div>
  )
}
