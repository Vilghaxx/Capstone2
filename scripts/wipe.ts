import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { readFileSync } from 'fs'
import * as path from 'path'

const KEY_PATH = path.join(process.cwd(), 'capstone-f6c32-firebase-adminsdk-fbsvc-9540650b6a.json')
const DATABASE_URL = process.env.FIREBASE_DATABASE_URL ?? 'https://capstone-f6c32-default-rtdb.firebaseio.com'

if (!getApps().length) {
  const sa = JSON.parse(readFileSync(KEY_PATH, 'utf-8'))
  initializeApp({ credential: cert(sa), databaseURL: DATABASE_URL })
}

const db = getDatabase()

async function main() {
  const confirmed = process.argv.includes('--yes') || process.env.WIPE_CONFIRM === 'yes'
  if (!confirmed) {
    console.log('Dry run — add --yes flag or set WIPE_CONFIRM=yes to actually wipe.')
    const snap = await db.ref('/').once('value')
    if (snap.exists()) {
      const keys = Object.keys(snap.val())
      console.log(`Would delete ${keys.length} root nodes: ${keys.join(', ')}`)
    } else {
      console.log('DB already empty.')
    }
    return
  }

  const snap = await db.ref('/').once('value')
  if (!snap.exists()) {
    console.log('DB already empty.')
    return
  }

  const keys = Object.keys(snap.val())
  console.log(`Deleting ${keys.length} root nodes: ${keys.join(', ')}`)
  await db.ref('/').set(null)
  console.log('All data wiped.')
}

main().then(() => process.exit(0)).catch((err) => { console.error('Wipe failed:', err); process.exit(1) })
