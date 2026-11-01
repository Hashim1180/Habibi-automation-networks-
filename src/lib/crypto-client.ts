/**
 * Client-side crypto utilities (Web Crypto API).
 *
 * Architecture:
 * - User signs up with an email + a vault passphrase (typed in browser, never sent to server in plaintext).
 * - Server stores ONLY an auth verifier (PBKDF2 hash of passphrase, server-side check for login).
 * - The SAME passphrase is used client-side to derive the vault key via PBKDF2 with a SEPARATE salt (vaultSalt).
 * - Vault key encrypts/decrypts vault entries via AES-GCM.
 * - For recovery (Option B): user is shown a 32-char recovery code once at signup.
 *   The vault key is encrypted with a recovery-key derived from that code, and the encrypted blob
 *   is stored on the server. To recover, user re-enters the code, vault key is decrypted client-side.
 *
 * Server NEVER sees: the passphrase, the vault key, the recovery code, or any vault entry plaintext.
 */

const PBKDF2_ITERATIONS = 250_000
const KEY_LENGTH_BITS = 256
const SALT_LENGTH_BYTES = 16
const IV_LENGTH_BYTES = 12

export interface EncryptedPayload {
  ciphertext: string // base64
  iv: string // base64
}

export interface VaultKeyMaterial {
  vaultKey: CryptoKey
  vaultSalt: string // base64 — stored on server, used to re-derive key on future sessions
}

// ---------- Encoding helpers ----------

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n)
  crypto.getRandomValues(arr)
  return arr
}

// ---------- Key derivation ----------

/**
 * Derive the vault key from the user's passphrase + vaultSalt.
 * The salt is generated at signup, stored on the server, returned to the browser
 * on each login so the same key can be re-derived.
 *
 * NOTE: key is derived as `extractable: true` so we can export its raw bytes
 * at signup time to encrypt the recovery blob. After signup, the key exists
 * only in browser memory and is never persisted. A future hardening pass can
 * re-derive it as non-extractable for the post-signup session.
 */
export async function deriveVaultKey(
  passphrase: string,
  vaultSaltB64: string,
): Promise<CryptoKey> {
  const salt = base64ToBuf(vaultSaltB64)
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    true, // extractable: needed to export raw bytes for recovery blob encryption
    ['encrypt', 'decrypt'],
  )
}

/**
 * Generate a fresh vault salt. Called once at signup.
 */
export function generateVaultSalt(): string {
  return bufToBase64(randomBytes(SALT_LENGTH_BYTES))
}

/**
 * Generate a fresh recovery salt. Separate from vault salt so recovery
 * key derivation is independent.
 */
export function generateRecoverySalt(): string {
  return bufToBase64(randomBytes(SALT_LENGTH_BYTES))
}

// ---------- Encryption ----------

export async function encryptVaultEntry(
  vaultKey: CryptoKey,
  plaintext: string,
): Promise<EncryptedPayload> {
  const iv = randomBytes(IV_LENGTH_BYTES)
  const enc = new TextEncoder()
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    vaultKey,
    enc.encode(plaintext),
  )
  return {
    ciphertext: bufToBase64(ciphertextBuf),
    iv: bufToBase64(iv),
  }
}

export async function decryptVaultEntry(
  vaultKey: CryptoKey,
  payload: EncryptedPayload,
): Promise<string> {
  const iv = base64ToBuf(payload.iv)
  const ciphertext = base64ToBuf(payload.ciphertext)
  const plaintextBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    vaultKey,
    ciphertext,
  )
  return new TextDecoder().decode(plaintextBuf)
}

// ---------- Recovery code (Option B) ----------

/**
 * Generate a human-friendly 32-char recovery code.
 * Format: 8 groups of 4 chars separated by dashes. Uses unambiguous alphabet.
 */
export function generateRecoveryCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1
  const bytes = randomBytes(32)
  let out = ''
  for (let i = 0; i < 32; i++) {
    out += alphabet[bytes[i] % alphabet.length]
    if ((i + 1) % 4 === 0 && i !== 31) out += '-'
  }
  return out
}

/**
 * Derive the recovery key from the recovery code + recoverySalt.
 * Used to encrypt the vault key (so it can be recovered if passphrase is lost).
 */
export async function deriveRecoveryKey(
  recoveryCode: string,
  recoverySaltB64: string,
): Promise<CryptoKey> {
  const salt = base64ToBuf(recoverySaltB64)
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(recoveryCode),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt the vault key (as raw bytes) with the recovery key.
 * Returns a base64 blob stored on the server as `vaultKeyBlob`.
 *
 * NOTE: we encrypt a deterministic re-derivation of the vault key, NOT the
 * passphrase, because the passphrase is never held outside the user's head.
 * The flow at signup:
 *   1. User types passphrase.
 *   2. Browser derives vaultKey from (passphrase, vaultSalt).
 *   3. Browser exports vaultKey as raw bytes.
 *   4. Browser derives recoveryKey from (recoveryCode, recoverySalt).
 *   5. Browser encrypts vaultKey bytes with recoveryKey → vaultKeyBlob.
 *   6. Browser sends vaultKeyBlob + salts to server. Passphrase never sent.
 */
export async function encryptVaultKeyForRecovery(
  vaultKey: CryptoKey,
  recoveryKey: CryptoKey,
): Promise<string> {
  // Export vault key to raw bytes
  const rawKey = await crypto.subtle.exportKey('raw', vaultKey)
  const iv = randomBytes(IV_LENGTH_BYTES)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    recoveryKey,
    rawKey,
  )
  // Pack iv + ciphertext together
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)
  return bufToBase64(combined)
}

/**
 * Recover the vault key from the stored blob, using the recovery code.
 * Called only when the user has lost their passphrase and is using their saved recovery code.
 */
export async function decryptVaultKeyForRecovery(
  vaultKeyBlobB64: string,
  recoveryKey: CryptoKey,
): Promise<CryptoKey> {
  const combined = base64ToBuf(vaultKeyBlobB64)
  const iv = combined.slice(0, IV_LENGTH_BYTES)
  const ciphertext = combined.slice(IV_LENGTH_BYTES)
  const rawKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    recoveryKey,
    ciphertext,
  )
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ---------- Auth verifier (sent to server) ----------
//
// The server needs to verify the passphrase for login WITHOUT seeing it.
// We do this with a SECOND PBKDF2 derivation using a SEPARATE authSalt,
// producing a verifier string that the server stores and compares.
//
// This is NOT zero-knowledge auth (the server could brute-force the verifier
// offline if it wanted to). For TRUE zero-knowledge auth we'd need a PAKE
// protocol like SRP or OPAQUE. For v1, this is honest:
//   - Server cannot read vault contents (vault key never leaves browser).
//   - Server CAN theoretically brute-force the auth verifier, but only if it
//     already has the salt + verifier (which it does) and significant compute.
//   - Upgrade path: SRP/OPAQUE for true ZK auth.
//
// The crypto promise we KEEP is "Hashim cannot read user vault contents."
// The auth layer is "best-effort passphrase gate, will be upgraded to PAKE."

export async function deriveAuthVerifier(
  passphrase: string,
  authSaltB64: string,
): Promise<string> {
  const salt = base64ToBuf(authSaltB64)
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    KEY_LENGTH_BITS,
  )
  return bufToBase64(bits)
}

export function generateAuthSalt(): string {
  return bufToBase64(randomBytes(SALT_LENGTH_BYTES))
}
