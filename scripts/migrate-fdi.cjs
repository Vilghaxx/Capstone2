// One-time migration: Universal (1-32) tooth numbers -> FDI / ISO 3950.
// The chart paths were originally keyed 1-32 in chart order, which is not
// Universal numbering. This mapping was verified against the rendered chart
// positions (patient's right = viewer's left) and matches the re-keyed
// src/lib/tooth-paths.js entries.
//
// Usage: node scripts/migrate-fdi.cjs
// Safe to re-run: exits if the meta/fdiMigration marker exists.

const { initializeApp, cert } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')
const { readFileSync, writeFileSync } = require('fs')
const path = require('path')

const OLD_TO_FDI = {
  1: 28, 2: 27, 3: 26, 4: 25, 5: 24, 6: 23, 7: 22, 8: 21,
  9: 11, 10: 12, 11: 13, 12: 14, 13: 15, 14: 16, 15: 17, 16: 18,
  17: 48, 18: 47, 19: 46, 20: 45, 21: 44, 22: 43, 23: 42, 24: 41,
  25: 31, 26: 32, 27: 33, 28: 34, 29: 35, 30: 36, 31: 37, 32: 38,
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'))
  }
  return JSON.parse(readFileSync(path.join(process.cwd(), 'capstone-f6c32-firebase-adminsdk-fbsvc-9540650b6a.json'), 'utf8'))
}

initializeApp({
  credential: cert(loadServiceAccount()),
  databaseURL: process.env.FIREBASE_DATABASE_URL ?? 'https://capstone-f6c32-default-rtdb.firebaseio.com',
})
const rtdb = getDatabase()

function toFdi(toothNumber) {
  const fdi = OLD_TO_FDI[toothNumber]
  if (!fdi) throw new Error(`Unexpected tooth number ${toothNumber}`)
  return fdi
}

async function main() {
  const markerSnap = await rtdb.ref('meta/fdiMigration').once('value')
  if (markerSnap.exists()) {
    console.log('Already migrated:', JSON.stringify(markerSnap.val()))
    process.exit(0)
  }

  const [teethSnap, treatmentsSnap] = await Promise.all([
    rtdb.ref('teeth').once('value'),
    rtdb.ref('treatments').once('value'),
  ])
  const teeth = teethSnap.val() ?? {}
  const treatments = treatmentsSnap.val() ?? {}
  const toothList = Object.values(teeth)
  const treatmentList = Object.values(treatments)

  const needsMigration = toothList.some((t) => t.toothNumber <= 10) || treatmentList.some((t) => t.toothNumber <= 10)
  if (!needsMigration) {
    console.log('Data already uses FDI numbers; writing marker only.')
    await rtdb.ref('meta/fdiMigration').set({ at: new Date().toISOString(), teeth: 0, treatments: 0 })
    process.exit(0)
  }

  const backupPath = path.join('/tmp/opencode', `fdi-backup-${Date.now()}.json`)
  writeFileSync(backupPath, JSON.stringify({ teeth, treatments }, null, 2))
  console.log('Backup written to', backupPath)

  const updates = {}
  const seen = new Set()
  let migratedTeeth = 0
  let migratedTreatments = 0

  for (const [id, tooth] of Object.entries(teeth)) {
    const fdi = toFdi(tooth.toothNumber)
    const key = `${tooth.patientId}-${fdi}`
    if (seen.has(key)) throw new Error(`Collision after migration: ${key}`)
    seen.add(key)
    if (fdi !== tooth.toothNumber) {
      updates[`teeth/${id}/toothNumber`] = fdi
      migratedTeeth++
    }
  }
  for (const [id, treatment] of Object.entries(treatments)) {
    const fdi = toFdi(treatment.toothNumber)
    if (fdi !== treatment.toothNumber) {
      updates[`treatments/${id}/toothNumber`] = fdi
      migratedTreatments++
    }
  }

  updates['meta/fdiMigration'] = {
    at: new Date().toISOString(),
    teeth: migratedTeeth,
    treatments: migratedTreatments,
  }
  await rtdb.ref().update(updates)
  console.log(`Migrated ${migratedTeeth} teeth and ${migratedTreatments} treatments to FDI.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
