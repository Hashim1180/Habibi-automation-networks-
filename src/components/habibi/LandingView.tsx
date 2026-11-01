'use client'

import { Button } from '@/components/ui/button'

interface Props {
  onSignup: () => void
  onLogin: () => void
}

export function LandingView({ onSignup, onLogin }: Props) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="cosmic-bg" />
      <div className="cosmic-grain" />

      {/* Top nav — minimal editorial */}
      <header className="px-8 py-6 flex items-center justify-between relative z-10">
        <div className="font-serif text-xl tracking-tight text-foreground">
          Krypta<span className="text-accent">.</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-stone-600">
          <a href="#architecture" className="editorial-link">Architecture</a>
          <a href="#fee" className="editorial-link">Fee</a>
          <a href="#sources" className="editorial-link">Sources</a>
          <a href="#operator" className="editorial-link">Operator</a>
          <a href="/download/TERMS.md" target="_blank" className="editorial-link">Terms</a>
        </nav>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={onLogin} className="text-stone-700 hover:text-foreground">
            Log in
          </Button>
          <Button size="sm" onClick={onSignup} className="bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-none">
            Create vault
          </Button>
        </div>
      </header>

      {/* Hero — editorial statement with mixed typography */}
      <section className="flex-1 flex items-center px-8 py-12 relative z-10">
        <div className="max-w-6xl mx-auto w-full">
          <div className="mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-stone-500">
            <span className="w-8 h-px bg-stone-400" />
            <span>Operator · Hashim</span>
            <span className="w-1 h-1 rounded-full bg-accent" />
            <span>First 10 users · 28% fee locked for life</span>
            <span className="w-1 h-1 rounded-full bg-accent" />
            <span>Zero-knowledge vault</span>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[0.95] text-foreground mb-8 max-w-5xl">
            The AI representative<br />
            that works <em className="text-accent not-italic font-light">for creators</em>,<br />
            not against <span className="italic">their privacy.</span>
          </h1>

          <div className="max-w-2xl mb-12">
            <p className="text-lg md:text-xl text-stone-700 leading-relaxed font-serif font-light">
              An autonomous client-hunting network where independent developers, designers, and creators store their skills, pricing floors, and portfolio behind <strong className="font-sans font-medium text-foreground">end-to-end encryption</strong> — so even the platform operator cannot read them.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Button
              size="lg"
              onClick={onSignup}
              className="bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-none px-8"
            >
              Create your vault
              <span className="ml-2">→</span>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={onLogin}
              className="text-stone-700 hover:text-foreground rounded-none"
            >
              I have an account
            </Button>
            <span className="text-xs text-stone-500 ml-2 hidden sm:inline">
              No card · No platform fee · Billing handled off-platform by Hashim
            </span>
          </div>
        </div>
      </section>

      {/* Architecture strip */}
      <section id="architecture" className="border-t border-stone-300/60 px-8 py-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-stone-500">
            <span className="w-8 h-px bg-stone-400" />
            <span>The architecture</span>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <Pillar
              n="01"
              title="Tier 1 — Operator-readable"
              body="Name, contact, optional feedback. Enough for Hashim to talk to you. Nothing more."
              detail="Stored in plaintext. Visible in admin panel."
            />
            <Pillar
              n="02"
              title="Tier 2 — Zero-knowledge vault"
              body="Skills, pricing, portfolio, BYOK API keys. Encrypted in-browser. Even Hashim can't read it."
              detail="AES-GCM 256-bit. Key derived from your passphrase via PBKDF2 (250k iterations)."
            />
            <Pillar
              n="03"
              title="Off-platform billing"
              body="Hashim's charges are separate from the app. You talk to him directly via your chosen channel."
              detail="No payment processing on the platform. No middleman fees."
            />
          </div>
        </div>
      </section>

      {/* Fee structure strip */}
      <section id="fee" className="border-t border-stone-300/60 px-8 py-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-stone-500">
            <span className="w-8 h-px bg-stone-400" />
            <span>Platform fee · locked at signup</span>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl mb-12 leading-tight text-foreground">
            First <em className="text-accent not-italic">10 users</em> pay 28%.<br />
            <span className="italic">Everyone after pays 35%.</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-stone-300 p-6 bg-white">
              <div className="text-xs uppercase tracking-[0.2em] text-accent mb-2">Early Adopter · 28%</div>
              <div className="font-serif text-5xl mb-3 text-foreground">28<span className="text-2xl">%</span></div>
              <p className="text-sm text-stone-700 leading-relaxed">
                Locked at signup for the first 10 users. Never increases, regardless of how large the platform grows.
                Covers API usage, VPS hosting, ads, and operator support — at a rate that rewards you for taking a chance on an unproven platform.
              </p>
              <div className="mt-4 text-xs text-stone-500 font-mono">
                $100 withdrawn → $28 fee → $72 to you
              </div>
            </div>
            <div className="border border-stone-300 p-6 bg-white">
              <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Standard · 35%</div>
              <div className="font-serif text-5xl mb-3 text-foreground">35<span className="text-2xl">%</span></div>
              <p className="text-sm text-stone-700 leading-relaxed">
                Locked at signup for users 11 onward. Never increases. Funds API usage, hosting, advertising for creator acquisition, and the personal-support model.
                Higher than typical freelance platforms — because the operator handles misuse personally and the AI does honest fit-matching instead of letting anyone bid on anything.
              </p>
              <div className="mt-4 text-xs text-stone-500 font-mono">
                $100 withdrawn → $35 fee → $65 to you
              </div>
            </div>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-stone-500 mb-2">Pakistan withdrawals</div>
              <div className="text-stone-800">JazzCash · EasyPaisa · NayaPay · Bank wire</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-stone-500 mb-2">India withdrawals</div>
              <div className="text-stone-800">Paytm · UPI · Bank wire</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-stone-500 mb-2">International withdrawals</div>
              <div className="text-stone-800">PayPal · Bank wire/ACH · Other (case-by-case)</div>
            </div>
          </div>

          <p className="mt-12 text-xs text-stone-500">
            Fee applies only on withdrawals — never on deposits. Minimum withdrawal: $20 USD.
            Full terms in <a href="/download/TERMS.md" target="_blank" className="text-accent underline editorial-link">TERMS.md</a>.
          </p>
        </div>
      </section>

      {/* Sources strip */}
      <section id="sources" className="border-t border-stone-300/60 px-8 py-20 relative z-10 bg-stone-900 text-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-stone-400">
            <span className="w-8 h-px bg-stone-500" />
            <span>Universal lead coverage</span>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl mb-8 leading-tight">
            We aggregate <em className="text-accent not-italic">everything legitimate.</em><br />
            We refuse <span className="italic">everything that isn't.</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-12 mt-12">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-400 mb-4">What we wire in</div>
              <ul className="space-y-2 text-stone-200 text-sm">
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>Hacker News (Who is hiring?)</span><span className="text-stone-400">free</span></li>
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>GitHub API</span><span className="text-stone-400">free</span></li>
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>Mastodon</span><span className="text-stone-400">free</span></li>
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>Bluesky (AT Protocol)</span><span className="text-stone-400">free</span></li>
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>Dev.to, Stack Exchange, RSS feeds</span><span className="text-stone-400">free</span></li>
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>X (Twitter), Reddit paid tiers</span><span className="text-stone-400">BYOK</span></li>
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>Your own Gmail, Calendly, Typeform</span><span className="text-stone-400">OAuth</span></li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-red-400 mb-4">What we will not build</div>
              <ul className="space-y-2 text-stone-300 text-sm">
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>Instagram scrapers</span><span className="text-red-400/70">ToS violation</span></li>
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>LinkedIn scrapers</span><span className="text-red-400/70">Sued &amp; won</span></li>
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>Fiverr / Upwork bots</span><span className="text-red-400/70">Bans your account</span></li>
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>Automated payment links</span><span className="text-red-400/70">Off-platform only</span></li>
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>Autonomous message dispatch</span><span className="text-red-400/70">You approve first</span></li>
                <li className="flex justify-between border-b border-stone-700 pb-2"><span>&quot;Supreme admin&quot; override</span><span className="text-red-400/70">No backdoor</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-12 border-t border-stone-700">
            <p className="font-serif italic text-2xl text-stone-300 max-w-3xl leading-relaxed">
              &quot;I&apos;d rather lose your business than ship the things that get your accounts banned.&quot;
            </p>
            <p className="text-sm text-stone-500 mt-3">— the operator</p>
          </div>
        </div>
      </section>

      {/* Operator strip */}
      <section id="operator" className="px-8 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-6 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] text-stone-500">
            <span className="w-8 h-px bg-stone-400" />
            <span>The operator</span>
            <span className="w-8 h-px bg-stone-400" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl mb-6 leading-tight">
            Hashim runs this personally.<br />
            <em className="text-accent not-italic">Misuse gets handled personally too.</em>
          </h2>
          <p className="text-stone-700 leading-relaxed">
            No automated account termination. No black-box moderation. When something goes wrong, Hashim talks to you directly — via the contact method you chose at signup. Billing is the same: separate from the app, handled in the channel you prefer.
          </p>
        </div>
      </section>

      <footer className="border-t border-stone-300/60 px-8 py-8 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500">
          <span className="font-serif text-base text-stone-700">Krypta<span className="text-accent">.</span></span>
          <span>Privacy by architecture, not by promise · Operator: Hashim</span>
          <span>Built on Next.js · Web Crypto · GLM-4.6</span>
        </div>
      </footer>
    </div>
  )
}

function Pillar({ n, title, body, detail }: { n: string; title: string; body: string; detail: string }) {
  return (
    <div>
      <div className="font-serif text-accent text-3xl mb-3">{n}</div>
      <h3 className="font-serif text-xl text-foreground mb-3 leading-tight">{title}</h3>
      <p className="text-stone-700 mb-3 leading-relaxed">{body}</p>
      <p className="text-xs text-stone-500 font-mono">{detail}</p>
    </div>
  )
}
