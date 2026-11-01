'use client'

import { Button } from '@/components/ui/button'
import { Shield, Lock, Sparkles, Globe } from 'lucide-react'

interface Props {
  onSignup: () => void
  onLogin: () => void
}

export function LandingView({ onSignup, onLogin }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center px-6 py-16">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-amber-100 text-amber-900 text-xs font-medium border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              Operator: Hashim · Universal Coverage · Zero-Knowledge Vault
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-stone-900 leading-tight mb-6">
              The AI business representative<br />
              <span className="text-amber-700">that works for creators</span>,<br />
              not against their privacy.
            </h1>
            <p className="text-stone-600 text-lg mb-8 leading-relaxed">
              An autonomous client-hunting network where independent developers,
              designers, and creators store their skills, pricing floors, and
              portfolio behind <strong className="text-stone-900">end-to-end encryption</strong> —
              so even the platform operator cannot read them.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={onSignup}
                className="bg-amber-700 hover:bg-amber-800 text-amber-50"
              >
                Create your vault
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onLogin}
                className="border-stone-300 text-stone-700"
              >
                I already have an account
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <FeatureCard
              icon={<Lock className="w-5 h-5 text-amber-700" />}
              title="Zero-knowledge vault"
              body="Your skills, pricing floors, and portfolio are encrypted in your browser before they ever hit the server. Hashim sees the structure ('you have 5 skills') — never the contents."
            />
            <FeatureCard
              icon={<Globe className="w-5 h-5 text-amber-700" />}
              title="Universal lead coverage"
              body="Aggregates Hacker News, GitHub, Mastodon, Bluesky, RSS feeds and 10+ other free legitimate sources. Bring your own paid API keys (X, Reddit) — your costs, your data."
            />
            <FeatureCard
              icon={<Sparkles className="w-5 h-5 text-amber-700" />}
              title="AI representative"
              body="Drafts outreach, handles objections, proposes milestones — calibrated to your verified skills. You approve every dispatch. Co-Pilot or Representative mode."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5 text-amber-700" />}
              title="Honest compliance"
              body="No Instagram scraping. No LinkedIn scraping. No Fiverr/Upwork bots. We don't ship the things that get your accounts banned."
            />
          </div>
        </div>
      </section>

      {/* Architecture strip */}
      <section className="border-t border-stone-200 bg-stone-50 px-6 py-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 text-center">
          <Pillar n="01" title="Tier 1 — Operator-readable" body="Name, contact, optional feedback. Enough for Hashim to talk to you. Nothing more." />
          <Pillar n="02" title="Tier 2 — Zero-knowledge vault" body="Skills, pricing, portfolio, BYOK API keys. Encrypted in-browser. Even Hashim can't read it." />
          <Pillar n="03" title="Off-platform billing" body="Hashim's charges are separate from the app. You talk to him directly via your chosen channel." />
        </div>
      </section>

      <footer className="border-t border-stone-200 px-6 py-6 text-center text-xs text-stone-500">
        Built for Hashim · Operator-owned · Privacy by architecture, not by promise
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h3 className="font-medium text-stone-900 mb-1">{title}</h3>
          <p className="text-sm text-stone-600 leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  )
}

function Pillar({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="font-serif text-amber-700 text-2xl mb-2">{n}</div>
      <h3 className="font-medium text-stone-900 mb-2">{title}</h3>
      <p className="text-sm text-stone-600">{body}</p>
    </div>
  )
}
