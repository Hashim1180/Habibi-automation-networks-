// End-to-end test: create a fake user with vault entries, then check what admin sees.
// Run with: bun run scripts/test-admin-view.ts

import { db } from '../src/lib/db'

async function main() {
  const fakeVaultSalt = Buffer.from(Math.random().toString(36)).toString('base64').slice(0, 24)
  const fakeRecoverySalt = Buffer.from(Math.random().toString(36)).toString('base64').slice(0, 24)
  const fakeAuthSalt = Buffer.from(Math.random().toString(36)).toString('base64').slice(0, 24)
  const fakeAuthVerifier = Buffer.from('fake-verifier-' + Math.random()).toString('base64')
  const fakeVaultKeyBlob = Buffer.from('fake-blob-' + Math.random()).toString('base64')

  const user = await db.user.create({
    data: {
      email: 'creator-test@example.com',
      name: 'Test Creator',
      contactMethod: 'whatsapp',
      contactValue: '+971 50 123 4567',
      feedback: 'Looking forward to getting client leads.',
      authSalt: fakeAuthSalt,
      authVerifier: fakeAuthVerifier,
      vaultSalt: fakeVaultSalt,
      recoverySalt: fakeRecoverySalt,
      vaultKeyBlob: fakeVaultKeyBlob,
      role: 'USER',
      tier: 'FREE',
      status: 'ACTIVE',
    },
  })

  await db.vaultEntry.createMany({
    data: [
      {
        userId: user.id,
        entryType: 'skill',
        label: 'Next.js 16',
        ciphertext: 'FAKE_CIPHERTEXT_WOULD_BE_HERE_BASE64',
        iv: 'FAKE_IV_BASE64',
        sortIndex: 0,
      },
      {
        userId: user.id,
        entryType: 'pricing',
        label: 'Hourly floor',
        ciphertext: 'FAKE_CIPHERTEXT_FOR_PRICING_BASE64',
        iv: 'FAKE_IV_BASE64_2',
        sortIndex: 0,
      },
      {
        userId: user.id,
        entryType: 'apikey',
        label: 'X API key',
        ciphertext: 'FAKE_CIPHERTEXT_FOR_APIKEY_BASE64',
        iv: 'FAKE_IV_BASE64_3',
        sortIndex: 0,
      },
    ],
  })

  console.log('Created test user:', user.id)
  console.log('Created 3 vault entries (skill, pricing, apikey)')

  // Now query what the admin endpoint would return (mirror of /api/admin/users logic)
  const users = await db.user.findMany({
    where: { role: 'USER' },
    include: {
      vaultEntries: {
        select: { id: true, entryType: true, label: true, updatedAt: true },
      },
      flagsFiled: { where: { status: 'OPEN' }, select: { id: true, reason: true, severity: true } },
    },
  })

  console.log('\n=== ADMIN VIEW (what Hashim sees) ===')
  for (const u of users) {
    console.log(`\nUser: ${u.name} (${u.email})`)
    console.log(`  Contact: ${u.contactMethod} = ${u.contactValue}`)
    console.log(`  Feedback: ${u.feedback}`)
    console.log(`  Vault entries: ${u.vaultEntries.length}`)
    for (const e of u.vaultEntries) {
      console.log(`    - [${e.entryType}] ${e.label}  (ciphertext deliberately NOT returned)`)
    }
  }

  const hasCiphertext = JSON.stringify(users).includes('ciphertext')
  console.log(`\n=== CRITICAL CHECK ===`)
  console.log(`Admin response includes 'ciphertext' field? ${hasCiphertext ? 'YES (BUG!)' : 'NO (correct)'}`)

  await db.vaultEntry.deleteMany({ where: { userId: user.id } })
  await db.user.delete({ where: { id: user.id } })
  console.log('\nCleaned up test user.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
