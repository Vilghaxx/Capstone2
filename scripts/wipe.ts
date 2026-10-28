import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { readFileSync } from 'fs'
import * as path from 'path'

const DATABASE_URL = process.env.FIREBASE_DATABASE_URL ?? 'https://sonidodentalsystem-default-rtdb.asia-southeast1.firebasedatabase.app'

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'))
  }
  const keyPath = process.env.FIREBASE_KEY_PATH
    ? path.resolve(process.env.FIREBASE_KEY_PATH)
    : path.join(process.cwd(), 'sonidodentalsystem-firebase-adminsdk-fbsvc-5784825144.json')
  return JSON.parse(readFileSync(keyPath, 'utf-8'))
}

if (!getApps().length) {
  initializeApp({ credential: cert(loadServiceAccount()), databaseURL: DATABASE_URL })
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
