'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react'
import { encryptVaultEntry, decryptVaultEntry } from '@/lib/crypto-client'
import type { VaultEntryDTO } from './types'

interface Props {
  vaultKey: CryptoKey
}

type EntryType = 'skill' | 'pricing' | 'portfolio' | 'note' | 'apikey'

const ENTRY_TYPES: { value: EntryType; label: string; placeholder: string; valuePlaceholder: string }[] = [
  { value: 'skill', label: 'Skill', placeholder: 'e.g. Next.js 16', valuePlaceholder: 'Years of experience, proficiency level, frameworks' },
  { value: 'pricing', label: 'Pricing floor', placeholder: 'e.g. Hourly rate floor', valuePlaceholder: '$85/hr minimum, no discounts below this' },
  { value: 'portfolio', label: 'Portfolio link', placeholder: 'e.g. Project name', valuePlaceholder: 'URL + brief description of what you built' },
  { value: 'note', label: 'Note', placeholder: 'e.g. Availability', valuePlaceholder: 'Free-form note about your availability, constraints, preferences' },
  { value: 'apikey', label: 'API key (BYOK)', placeholder: 'e.g. X API key', valuePlaceholder: 'The actual API key — encrypted, only used when you authorize' },
]

export function VaultEditor({ vaultKey }: Props) {
  const [entries, setEntries] = useState<VaultEntryDTO[]>([])
  const [busy, setBusy] = useState(true)
  const [activeTab, setActiveTab] = useState<EntryType>('skill')
  const [decryptedValues, setDecryptedValues] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setBusy(true)
    const res = await fetch('/api/vault')
    const data = await res.json()
    setEntries(data.entries || [])
    setBusy(false)
    // Decrypt all entries in browser
    for (const e of data.entries || []) {
      if (e.ciphertext && e.iv) {
        try {
          const pt = await decryptVaultEntry(vaultKey, { ciphertext: e.ciphertext, iv: e.iv })
          setDecryptedValues((prev) => ({ ...prev, [e.id]: pt }))
        } catch (err) {
          console.error('decrypt failed for', e.id, err)
        }
      }
    }
  }, [vaultKey])

  useEffect(() => {
    const id = setTimeout(() => load(), 0)
    return () => clearTimeout(id)
  }, [load])

  async function createEntry(type: EntryType, label: string, value: string) {
    if (!label || !value) return
    const { ciphertext, iv } = await encryptVaultEntry(vaultKey, value)
    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryType: type, label, ciphertext, iv }),
    })
    if (res.ok) {
      await load()
    }
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/vault/${id}`, { method: 'DELETE' })
    await load()
  }

  async function updateEntry(id: string, type: EntryType, label: string, value: string) {
    const { ciphertext, iv } = await encryptVaultEntry(vaultKey, value)
    await fetch(`/api/vault/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryType: type, label, ciphertext, iv }),
    })
    await load()
  }

  const entriesByType = (type: EntryType) => entries.filter((e) => e.entryType === type)

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-amber-700" />
          <span className="text-xs uppercase tracking-wide text-stone-500">Tier 2 — Zero-knowledge vault</span>
        </div>
        <CardTitle className="font-serif text-xl text-stone-900">Your encrypted vault</CardTitle>
        <CardDescription>
          Everything here is encrypted in your browser before it's saved. The server stores only ciphertext.
          Hashim sees that you have entries — never their contents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntryType)}>
          <TabsList className="flex flex-wrap h-auto bg-stone-100">
            {ENTRY_TYPES.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-amber-700 data-[state=active]:text-amber-50">
                {t.label}
                <span className="ml-2 text-xs opacity-60">({entriesByType(t.value).length})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {ENTRY_TYPES.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              <VaultEntryList
                type={t.value}
                entries={entriesByType(t.value)}
                decryptedValues={decryptedValues}
                onCreate={(label, value) => createEntry(t.value, label, value)}
                onDelete={deleteEntry}
                onUpdate={(id, label, value) => updateEntry(id, t.value, label, value)}
                placeholder={t.placeholder}
                valuePlaceholder={t.valuePlaceholder}
              />
            </TabsContent>
          ))}
        </Tabs>

        {busy && (
          <div className="mt-4 flex items-center gap-2 text-sm text-stone-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading vault…
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ListProps {
  type: EntryType
  entries: VaultEntryDTO[]
  decryptedValues: Record<string, string>
  onCreate: (label: string, value: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onUpdate: (id: string, label: string, value: string) => Promise<void>
  placeholder: string
  valuePlaceholder: string
}

function VaultEntryList({
  entries, decryptedValues, onCreate, onDelete, onUpdate, placeholder, valuePlaceholder,
}: ListProps) {
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editValue, setEditValue] = useState('')

  return (
    <div className="space-y-3">
      {/* Existing entries */}
      {entries.length === 0 && !adding && (
        <p className="text-sm text-stone-500 py-2">No entries yet. Add one below.</p>
      )}

      {entries.map((e) => (
        <div
          key={e.id}
          className="rounded-md border border-stone-200 bg-white p-3 flex items-start justify-between gap-3"
        >
          {editId === e.id ? (
            <div className="flex-1 space-y-2">
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Label"
              />
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={valuePlaceholder}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    await onUpdate(e.id, editLabel, editValue)
                    setEditId(null)
                  }}
                  className="bg-amber-700 hover:bg-amber-800 text-amber-50"
                >
                  <Check className="w-3 h-3 mr-1" /> Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditId(null)}
                >
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-900 truncate">{e.label}</div>
                <div className="text-sm text-stone-600 break-words whitespace-pre-wrap">
                  {decryptedValues[e.id] || <span className="italic text-stone-400">decrypting…</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditId(e.id)
                    setEditLabel(e.label)
                    setEditValue(decryptedValues[e.id] || '')
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(e.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Add new */}
      {adding ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={placeholder}
          />
          <Textarea
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={valuePlaceholder}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                await onCreate(newLabel, newValue)
                setNewLabel('')
                setNewValue('')
                setAdding(false)
              }}
              disabled={!newLabel || !newValue}
              className="bg-amber-700 hover:bg-amber-800 text-amber-50"
            >
              <Check className="w-3 h-3 mr-1" /> Add & encrypt
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAdding(false)}
            >
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          className="border-stone-300"
        >
          <Plus className="w-3 h-3 mr-1" /> Add entry
        </Button>
      )}
    </div>
  )
}
