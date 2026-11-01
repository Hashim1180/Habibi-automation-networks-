'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wallet as WalletIcon, Plus, Loader2, ArrowDownCircle, ArrowUpCircle, Percent, Lock } from 'lucide-react'
import { decryptVaultEntry } from '@/lib/crypto-client'
import type { VaultEntryDTO } from './types'

interface WalletData {
  wallet: {
    balanceUsd: string
    balanceCents: number
    lifetimeEarningsUsd: string
    lifetimeFeesUsd: string
    lifetimeWithdrawnUsd: string
  }
  feeRate: {
    rate: number
    ratePercent: string
    isEarlyAdopter: boolean
    description: string
  }
  pendingWithdrawals: number
  transactions: Array<{
    id: string
    type: string
    amountUsd: string
    description: string | null
    status: string
    createdAt: string
  }>
  minimumWithdrawalUsd: string
  minimumWithdrawalCents: number
}

interface WithdrawalMethod {
  vaultEntryId: string
  methodType: string
  label: string
  decrypted: { accountHolder?: string; phone?: string; accountNumber?: string; routing?: string; bankName?: string; upiId?: string; paypalEmail?: string; notes?: string } | null
}

const METHOD_TYPES = [
  { value: 'jazzcash', label: 'JazzCash (Pakistan)' },
  { value: 'easypaisa', label: 'EasyPaisa (Pakistan)' },
  { value: 'nayapay', label: 'NayaPay (Pakistan)' },
  { value: 'paytm', label: 'Paytm (India)' },
  { value: 'upi', label: 'UPI (India)' },
  { value: 'paypal', label: 'PayPal (International)' },
  { value: 'bank', label: 'Bank Account (Wire/ACH)' },
  { value: 'other', label: 'Other (Hashim will contact you)' },
]

interface Props {
  vaultKey: CryptoKey
}

export function WalletView({ vaultKey }: Props) {
  const [data, setData] = useState<WalletData | null>(null)
  const [busy, setBusy] = useState(true)
  const [methods, setMethods] = useState<WithdrawalMethod[]>([])
  const [showAddMethod, setShowAddMethod] = useState(false)
  const [showRequestWithdrawal, setShowRequestWithdrawal] = useState(false)

  async function loadWallet() {
    setBusy(true)
    const res = await fetch('/api/wallet')
    const json = await res.json()
    setData(json)
    setBusy(false)
  }

  async function loadMethods() {
    // Fetch vault entries of type "withdrawal_method" and decrypt them
    const res = await fetch('/api/vault')
    const json = await res.json()
    const methodEntries: VaultEntryDTO[] = (json.entries || []).filter(
      (e: VaultEntryDTO) => e.entryType === 'withdrawal_method'
    )
    const decrypted: WithdrawalMethod[] = []
    for (const e of methodEntries) {
      let parsed: any = null
      if (e.ciphertext && e.iv) {
        try {
          const pt = await decryptVaultEntry(vaultKey, { ciphertext: e.ciphertext, iv: e.iv })
          parsed = JSON.parse(pt)
        } catch (err) {
          console.error('decrypt failed', err)
        }
      }
      decrypted.push({
        vaultEntryId: e.id,
        methodType: parsed?.methodType || 'other',
        label: e.label,
        decrypted: parsed,
      })
    }
    setMethods(decrypted)
  }

  useEffect(() => {
    const id = setTimeout(() => {
      loadWallet()
      loadMethods()
    }, 0)
    return () => clearTimeout(id)
  }, [])

  if (busy || !data) {
    return (
      <Card className="border-stone-300">
        <CardContent className="py-12 flex items-center justify-center gap-2 text-stone-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading wallet…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Balance + fee rate card */}
      <Card className="border-stone-300">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <WalletIcon className="w-4 h-4 text-accent" />
            <span className="text-xs uppercase tracking-wide text-stone-500">Personal wallet · ledger</span>
          </div>
          <CardTitle className="font-serif text-2xl text-foreground">Wallet</CardTitle>
          <CardDescription>
            Your earnings from completed projects, tracked as a ledger. Real money movement happens off-platform — Hashim fulfills withdrawals via your chosen method.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Current balance" value={`$${data.wallet.balanceUsd}`} highlight />
            <Stat label="Lifetime earnings" value={`$${data.wallet.lifetimeEarningsUsd}`} />
            <Stat label="Lifetime fees paid" value={`$${data.wallet.lifetimeFeesUsd}`} />
            <Stat label="Lifetime withdrawn" value={`$${data.wallet.lifetimeWithdrawnUsd}`} />
          </div>

          <div className={`mt-4 p-3 rounded border ${
            data.feeRate.isEarlyAdopter
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-stone-100 border-stone-200 text-stone-700'
          }`}>
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              <span className="font-medium">
                Your platform fee: {data.feeRate.ratePercent}
                {data.feeRate.isEarlyAdopter && (
                  <span className="ml-2 text-xs uppercase tracking-wide">Early Adopter · locked for life</span>
                )}
              </span>
            </div>
            <p className="text-xs mt-1 opacity-80">{data.feeRate.description}</p>
            {data.pendingWithdrawals > 0 && (
              <p className="text-xs mt-2">
                <span className="font-medium">{data.pendingWithdrawals}</span> pending withdrawal request{data.pendingWithdrawals > 1 ? 's' : ''} awaiting Hashim&apos;s review.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal methods */}
      <Card className="border-stone-300">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-accent" />
            <span className="text-xs uppercase tracking-wide text-stone-500">Encrypted in vault</span>
          </div>
          <CardTitle className="font-serif text-xl text-foreground">Withdrawal methods</CardTitle>
          <CardDescription>
            Saved methods are encrypted in your browser before storage. Hashim sees only the label (e.g. &quot;JazzCash +92 300 1234567&quot;) — never the full details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {methods.length === 0 ? (
            <div className="text-sm text-stone-500 py-4">
              No withdrawal methods yet. Add one to enable withdrawal requests.
            </div>
          ) : (
            <div className="space-y-2">
              {methods.map((m) => (
                <div key={m.vaultEntryId} className="rounded border border-stone-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">{m.label}</div>
                      <div className="text-xs text-stone-500 uppercase tracking-wide">
                        {METHOD_TYPES.find((t) => t.value === m.methodType)?.label || m.methodType}
                      </div>
                    </div>
                    <div className="text-xs text-stone-500">
                      {m.decrypted?.phone && `Phone: ${m.decrypted.phone}`}
                      {m.decrypted?.accountNumber && `Account: ${m.decrypted.accountNumber.slice(-4).padStart(m.decrypted.accountNumber.length, '•')}`}
                      {m.decrypted?.upiId && `UPI: ${m.decrypted.upiId}`}
                      {m.decrypted?.paypalEmail && `Email: ${m.decrypted.paypalEmail}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddMethod(true)}
            className="mt-3 border-stone-300 rounded-none"
          >
            <Plus className="w-3 h-3 mr-1" /> Add withdrawal method
          </Button>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setShowRequestWithdrawal(true)}
          disabled={methods.length === 0 || data.wallet.balanceCents < data.minimumWithdrawalCents}
          className="bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-none"
        >
          <ArrowUpCircle className="w-4 h-4 mr-2" />
          Request withdrawal
        </Button>
        {methods.length === 0 && (
          <span className="text-xs text-stone-500 self-center">Add a withdrawal method first.</span>
        )}
        {methods.length > 0 && data.wallet.balanceCents < data.minimumWithdrawalCents && (
          <span className="text-xs text-stone-500 self-center">
            Minimum withdrawal is ${data.minimumWithdrawalUsd}. Current balance: ${data.wallet.balanceUsd}.
          </span>
        )}
      </div>

      {/* Transaction history */}
      <Card className="border-stone-300">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle className="w-4 h-4 text-accent" />
            <span className="text-xs uppercase tracking-wide text-stone-500">Transaction history</span>
          </div>
          <CardTitle className="font-serif text-xl text-foreground">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.transactions.length === 0 ? (
            <p className="text-sm text-stone-500 py-4">No transactions yet. Earnings appear here after Hashim records a deposit for a completed milestone.</p>
          ) : (
            <div className="space-y-1">
              {data.transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                  <div>
                    <div className="text-sm font-medium capitalize text-foreground">{t.type}</div>
                    <div className="text-xs text-stone-500">{t.description || '—'}</div>
                    <div className="text-xs text-stone-400">{new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                  <div className={`font-mono text-sm ${t.amountUsd.startsWith('-') ? 'text-red-700' : 'text-emerald-700'}`}>
                    {t.amountUsd.startsWith('-') ? '' : '+'}${t.amountUsd}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showAddMethod && (
        <AddMethodModal
          vaultKey={vaultKey}
          onClose={() => setShowAddMethod(false)}
          onSaved={() => {
            setShowAddMethod(false)
            loadMethods()
          }}
        />
      )}

      {showRequestWithdrawal && data && (
        <RequestWithdrawalModal
          wallet={data}
          methods={methods}
          onClose={() => setShowRequestWithdrawal(false)}
          onSubmitted={() => {
            setShowRequestWithdrawal(false)
            loadWallet()
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded p-3 ${highlight ? 'bg-stone-900 text-stone-50' : 'bg-stone-50 border border-stone-200'}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className={`font-serif text-2xl mt-1 ${highlight ? '' : 'text-foreground'}`}>{value}</div>
    </div>
  )
}

function AddMethodModal({ vaultKey, onClose, onSaved }: { vaultKey: CryptoKey; onClose: () => void; onSaved: () => void }) {
  const [methodType, setMethodType] = useState('jazzcash')
  const [label, setLabel] = useState('')
  const [phone, setPhone] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [routing, setRouting] = useState('')
  const [bankName, setBankName] = useState('')
  const [upiId, setUpiId] = useState('')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)

    if (!label) {
      setError('Label is required (e.g. "JazzCash +92 300 1234567").')
      setBusy(false)
      return
    }

    // Build the method detail JSON — to be encrypted
    const details: any = { methodType }
    if (phone) details.phone = phone
    if (accountHolder) details.accountHolder = accountHolder
    if (accountNumber) details.accountNumber = accountNumber
    if (routing) details.routing = routing
    if (bankName) details.bankName = bankName
    if (upiId) details.upiId = upiId
    if (paypalEmail) details.paypalEmail = paypalEmail
    if (notes) details.notes = notes

    const plaintext = JSON.stringify(details)
    const { encryptVaultEntry } = await import('@/lib/crypto-client')
    const { ciphertext, iv } = await encryptVaultEntry(vaultKey, plaintext)

    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryType: 'withdrawal_method',
        label,
        ciphertext,
        iv,
      }),
    })

    if (!res.ok) {
      setError('Failed to save method.')
      setBusy(false)
      return
    }

    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-none">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Add withdrawal method</CardTitle>
          <CardDescription>Method details are encrypted in your browser. Hashim sees only the label.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Method type</Label>
            <Select value={methodType} onValueChange={setMethodType}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHOD_TYPES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Label (visible to Hashim)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. JazzCash +92 300 1234567"
              className="rounded-none"
            />
            <p className="text-xs text-stone-500">This label IS visible to Hashim. Make it identifiable but not full account details.</p>
          </div>

          {/* Method-specific fields */}
          {['jazzcash', 'easypaisa', 'nayapay', 'paytm'].includes(methodType) && (
            <div className="space-y-1">
              <Label>Phone number linked to wallet</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 1234567" className="rounded-none" />
            </div>
          )}

          {methodType === 'upi' && (
            <div className="space-y-1">
              <Label>UPI ID</Label>
              <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@bank" className="rounded-none" />
            </div>
          )}

          {methodType === 'paypal' && (
            <div className="space-y-1">
              <Label>PayPal email</Label>
              <Input value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} placeholder="you@example.com" className="rounded-none" />
            </div>
          )}

          {methodType === 'bank' && (
            <>
              <div className="space-y-1">
                <Label>Account holder name</Label>
                <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="rounded-none" />
              </div>
              <div className="space-y-1">
                <Label>Account number</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="rounded-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Routing / SWIFT</Label>
                  <Input value={routing} onChange={(e) => setRouting(e.target.value)} className="rounded-none" />
                </div>
                <div className="space-y-1">
                  <Label>Bank name</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="rounded-none" />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any extra info Hashim should know" className="rounded-none" />
          </div>

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2">{error}</div>}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose} className="rounded-none">Cancel</Button>
            <Button onClick={save} disabled={busy} className="bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-none">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3 mr-1" />}
              Encrypt & save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RequestWithdrawalModal({
  wallet,
  methods,
  onClose,
  onSubmitted,
}: {
  wallet: WalletData
  methods: WithdrawalMethod[]
  onClose: () => void
  onSubmitted: () => void
}) {
  const [amount, setAmount] = useState('')
  const [methodId, setMethodId] = useState(methods[0]?.vaultEntryId || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<any>(null)

  const amountCents = Math.round(parseFloat(amount || '0') * 100)
  const feeRate = wallet.feeRate.rate
  const feeCents = Math.round(amountCents * feeRate)
  const netCents = amountCents - feeCents

  async function submit() {
    setBusy(true)
    setError(null)
    const method = methods.find((m) => m.vaultEntryId === methodId)
    if (!method) {
      setError('Select a withdrawal method.')
      setBusy(false)
      return
    }
    if (amountCents < wallet.minimumWithdrawalCents) {
      setError(`Minimum withdrawal is $${wallet.minimumWithdrawalUsd}.`)
      setBusy(false)
      return
    }
    if (amountCents > wallet.wallet.balanceCents) {
      setError(`Insufficient balance. Current: $${wallet.wallet.balanceUsd}.`)
      setBusy(false)
      return
    }

    const res = await fetch('/api/wallet/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountCents,
        methodType: method.methodType,
        methodLabel: method.label,
        methodVaultEntryId: method.vaultEntryId,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to submit.')
      setBusy(false)
      return
    }
    setConfirmation(data.summary)
    setBusy(false)
  }

  if (confirmation) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
        <Card className="w-full max-w-md rounded-none">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Withdrawal request submitted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Gross amount" value={`$${confirmation.grossUsd}`} />
            <Row label={`Platform fee (${confirmation.feePercent})`} value={`-$${confirmation.feeUsd}`} negative />
            <Row label="You receive" value={`$${confirmation.netUsd}`} highlight />
            <Row label="Method" value={confirmation.methodLabel} />
            <div className="text-xs text-stone-600 bg-stone-100 p-2 mt-2">
              {confirmation.note}
            </div>
            <Button onClick={onSubmitted} className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-none mt-3">
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
      <Card className="w-full max-w-md rounded-none">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Request withdrawal</CardTitle>
          <CardDescription>Your fee rate is {wallet.feeRate.ratePercent}{wallet.feeRate.isEarlyAdopter ? ' (Early Adopter — locked for life)' : ''}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Amount (USD)</Label>
            <Input
              type="number"
              step="0.01"
              min={wallet.minimumWithdrawalUsd}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100.00"
              className="rounded-none"
            />
            <p className="text-xs text-stone-500">Available balance: ${wallet.wallet.balanceUsd}. Minimum: ${wallet.minimumWithdrawalUsd}.</p>
          </div>

          <div className="space-y-1">
            <Label>Withdrawal method</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {methods.map((m) => (
                  <SelectItem key={m.vaultEntryId} value={m.vaultEntryId}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {amountCents > 0 && (
            <div className="bg-stone-100 p-3 rounded space-y-1 text-sm">
              <Row label="Gross amount" value={`$${(amountCents / 100).toFixed(2)}`} />
              <Row label={`Platform fee (${(feeRate * 100).toFixed(0)}%)`} value={`-$${(feeCents / 100).toFixed(2)}`} negative />
              <div className="border-t border-stone-300 pt-1 mt-1">
                <Row label="You receive" value={`$${(netCents / 100).toFixed(2)}`} highlight />
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2">{error}</div>}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={onClose} className="rounded-none">Cancel</Button>
            <Button onClick={submit} disabled={busy || amountCents <= 0} className="bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-none">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Submit request
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value, negative, highlight }: { label: string; value: string; negative?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={highlight ? 'font-medium text-foreground' : 'text-stone-600'}>{label}</span>
      <span className={`font-mono ${highlight ? 'font-bold text-foreground' : negative ? 'text-red-700' : 'text-foreground'}`}>{value}</span>
    </div>
  )
}
