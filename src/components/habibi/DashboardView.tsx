'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { LogOut, Shield, User, Lock, Megaphone, Globe, Sparkles, Compass, Wallet } from 'lucide-react'
import type { SessionUserDTO, DashboardTab } from './types'
import { ProfileForm } from './ProfileForm'
import { VaultEditor } from './VaultEditor'
import { LeadsView } from './LeadsView'
import { AdminPanel } from './AdminPanel'
import { MarketplaceView } from './MarketplaceView'
import { GuideAI } from './GuideAI'
import { WalletView } from './WalletView'

interface Props {
  user: SessionUserDTO
  vaultKey: CryptoKey
  onLogout: () => void
}

export function DashboardView({ user, vaultKey, onLogout }: Props) {
  const [tab, setTab] = useState<DashboardTab | 'guide' | 'admin'>('guide')

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="cosmic-bg" />
      <div className="cosmic-grain" />

      <header className="border-b border-stone-300/60 bg-stone-50/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <div className="font-serif text-xl text-foreground tracking-tight">
              Krypta<span className="text-accent">.</span>
            </div>
            <span className="text-xs text-stone-500 hidden sm:inline">
              · {user.name || user.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user.role === 'ADMIN' && (
              <Button
                size="sm"
                variant={tab === 'admin' ? 'default' : 'ghost'}
                onClick={() => setTab('admin')}
                className={tab === 'admin' ? 'bg-stone-900 text-stone-50 rounded-none' : 'text-stone-700 rounded-none'}
              >
                <Shield className="w-3 h-3 mr-1" /> Admin
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onLogout} className="text-stone-600 rounded-none">
              <LogOut className="w-3 h-3 mr-1" /> Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 relative z-10">
        {tab === 'admin' && user.role === 'ADMIN' ? (
          <AdminPanel />
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as DashboardTab | 'guide' | 'admin')}>
            <TabsList className="flex flex-wrap h-auto bg-stone-100 mb-8 rounded-none p-1">
              <TabsTrigger value="guide" className="rounded-none data-[state=active]:bg-stone-900 data-[state=active]:text-stone-50">
                <Compass className="w-3 h-3 mr-2" /> Guide AI
              </TabsTrigger>
              <TabsTrigger value="profile" className="rounded-none data-[state=active]:bg-stone-900 data-[state=active]:text-stone-50">
                <User className="w-3 h-3 mr-2" /> Profile
              </TabsTrigger>
              <TabsTrigger value="vault" className="rounded-none data-[state=active]:bg-stone-900 data-[state=active]:text-stone-50">
                <Lock className="w-3 h-3 mr-2" /> Vault
              </TabsTrigger>
              <TabsTrigger value="wallet" className="rounded-none data-[state=active]:bg-stone-900 data-[state=active]:text-stone-50">
                <Wallet className="w-3 h-3 mr-2" /> Wallet
              </TabsTrigger>
              <TabsTrigger value="leads" className="rounded-none data-[state=active]:bg-stone-900 data-[state=active]:text-stone-50">
                <Globe className="w-3 h-3 mr-2" /> Leads
              </TabsTrigger>
              <TabsTrigger value="rep" className="rounded-none data-[state=active]:bg-stone-900 data-[state=active]:text-stone-50">
                <Sparkles className="w-3 h-3 mr-2" /> AI Rep
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="rounded-none data-[state=active]:bg-stone-900 data-[state=active]:text-stone-50">
                <Megaphone className="w-3 h-3 mr-2" /> Marketplace
              </TabsTrigger>
            </TabsList>

            <TabsContent value="guide">
              <GuideAI vaultKey={vaultKey} />
            </TabsContent>

            <TabsContent value="profile">
              <ProfileForm />
            </TabsContent>

            <TabsContent value="vault">
              <VaultEditor vaultKey={vaultKey} />
            </TabsContent>

            <TabsContent value="wallet">
              <WalletView vaultKey={vaultKey} />
            </TabsContent>

            <TabsContent value="leads">
              <LeadsView vaultKey={vaultKey} />
            </TabsContent>

            <TabsContent value="rep">
              <LeadsView vaultKey={vaultKey} />
            </TabsContent>

            <TabsContent value="marketplace">
              <MarketplaceView />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="border-t border-stone-300/60 bg-stone-50/80 px-6 py-4 relative z-10">
        <div className="max-w-6xl mx-auto text-xs text-stone-500 flex flex-wrap items-center justify-between gap-2">
          <span>Operator: Hashim · Billing off-platform · Misuse handled personally · Fee rate locked at signup</span>
          <span>Tier: {user.tier} · Status: {user.status}</span>
        </div>
      </footer>
    </div>
  )
}
