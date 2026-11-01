export type View =
  | 'landing'
  | 'signup'
  | 'login'
  | 'dashboard'
  | 'admin'

export type DashboardTab =
  | 'profile'
  | 'vault'
  | 'keys'
  | 'leads'
  | 'rep'
  | 'guide'
  | 'marketplace'

export interface VaultEntryDTO {
  id: string
  entryType: string // 'skill' | 'pricing' | 'portfolio' | 'note' | 'apikey'
  label: string
  ciphertext: string
  iv: string
  sortIndex: number
  createdAt: string
  updatedAt: string
}

export interface ProfileDTO {
  email: string | null
  name: string | null
  contactMethod: string
  contactValue: string | null
  feedback: string | null
  tier: string
  role: string
  status: string
  createdAt: string
}

export interface SessionUserDTO {
  id: string
  email: string | null
  name: string | null
  role: string
  tier: string
  status: string
}

export interface LeadDTO {
  source: string
  externalId: string
  title: string
  body: string
  url: string
  author: string | null
  postedAt: string
}

export interface DraftResponse {
  scenario: string
  subject: string
  body: string
  mode: string
  note: string
}

// Decrypted vault shape passed to the AI rep endpoint
export interface DecryptedVaultPayload {
  skills: { label: string; value: string }[]
  pricing: { label: string; value: string }[]
  portfolio: { label: string; value: string }[]
  notes: { label: string; value: string }[]
}
