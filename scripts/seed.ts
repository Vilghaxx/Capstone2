import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import * as path from 'path'
import bcrypt from 'bcryptjs'

const KEY_PATH = path.join(process.cwd(), 'capstone-f6c32-firebase-adminsdk-fbsvc-9540650b6a.json')

if (!getApps().length) {
  const sa = JSON.parse(readFileSync(KEY_PATH, 'utf-8'))
  initializeApp({ credential: cert(sa) })
}

const firestore = getFirestore()

async function main() {
  console.log('Seeding staff accounts...\n')

  const staff = [
    {
      username: process.env.SEED_DENTIST_USERNAME ?? 'dentist',
      password: process.env.SEED_DENTIST_PASSWORD ?? 'dentist123',
      role: 'dentist',
      name: process.env.SEED_DENTIST_NAME ?? 'Dr. Amara Reyes',
    },
    {
      username: process.env.SEED_CASHIER_USERNAME ?? 'cashier',
      password: process.env.SEED_CASHIER_PASSWORD ?? 'cashier123',
      role: 'cashier',
      name: process.env.SEED_CASHIER_NAME ?? 'Marco Dela Cruz',
    },
  ]

  let created = 0
  for (const s of staff) {
    const snap = await firestore.collection('users').where('username', '==', s.username).limit(1).get()
    if (!snap.empty) {
      console.log(`  ${s.role} "${s.username}" already exists — skip`)
      continue
    }
    const hashed = bcrypt.hashSync(s.password, 10)
    await firestore.collection('users').add({
      username: s.username,
      password: hashed,
      role: s.role,
      name: s.name,
      createdAt: Timestamp.now(),
    })
    console.log(`  + Created ${s.role} "${s.username}" (${s.name})`)
    created++
  }

  console.log(`\n${created === 0 ? 'No new accounts needed' : `Created ${created} account(s)`}. Done.`)
  console.log('\nChange default passwords after first login.')
}

main().catch((err) => { console.error('Seed failed:', err); process.exit(1) })
