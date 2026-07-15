import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { readFileSync } from 'fs'
import * as path from 'path'
import bcrypt from 'bcryptjs'

const KEY_PATH = path.join(process.cwd(), 'capstone-f6c32-firebase-adminsdk-fbsvc-9540650b6a.json')
const DATABASE_URL = process.env.FIREBASE_DATABASE_URL ?? 'https://capstone-f6c32-default-rtdb.firebaseio.com'

if (!getApps().length) {
  const sa = JSON.parse(readFileSync(KEY_PATH, 'utf-8'))
  initializeApp({ credential: cert(sa), databaseURL: DATABASE_URL })
}

const db = getDatabase()

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
    const snap = await db.ref('users').orderByChild('username').equalTo(s.username).limitToFirst(1).once('value')
    if (snap.exists()) {
      console.log(`  ${s.role} "${s.username}" already exists — skip`)
      continue
    }
    const hashed = bcrypt.hashSync(s.password, 10)
    const userRef = db.ref('users').push()
    await userRef.set({
      username: s.username,
      password: hashed,
      role: s.role,
      name: s.name,
      id: userRef.key,
      createdAt: new Date().toISOString(),
    })
    console.log(`  + Created ${s.role} "${s.username}" (${s.name})`)
    created++
  }

  console.log(`\n${created === 0 ? 'No new accounts needed' : `Created ${created} account(s)`}. Done.`)
  console.log('\nChange default passwords after first login.')
}

main().catch((err) => { console.error('Seed failed:', err); process.exit(1) })
