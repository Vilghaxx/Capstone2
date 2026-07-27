import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { readFileSync } from 'fs'
import * as path from 'path'
import { faker } from '@faker-js/faker'

const KEY_PATH = path.join(process.cwd(), 'capstone-f6c32-firebase-adminsdk-fbsvc-9540650b6a.json')
const DATABASE_URL = process.env.FIREBASE_DATABASE_URL ?? 'https://capstone-f6c32-default-rtdb.firebaseio.com'

if (!getApps().length) {
  const sa = JSON.parse(readFileSync(KEY_PATH, 'utf-8'))
  initializeApp({ credential: cert(sa), databaseURL: DATABASE_URL })
}

const db = getDatabase()

function now() { return new Date().toISOString() }
function daysFromNow(n: number): string {
  const d = new Date(); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

const APPT_TYPES = ['checkup', 'cleaning', 'filling', 'extraction', 'root-canal', 'crown', 'other']
const PROCEDURES = [
  { name: 'Checkup', cost: 500 },
  { name: 'Teeth Cleaning', cost: 800 },
  { name: 'Composite Filling', cost: 1500 },
  { name: 'Simple Extraction', cost: 3000 },
  { name: 'Root Canal Treatment', cost: 6500 },
  { name: 'Crown Placement', cost: 5000 },
  { name: 'X-Ray', cost: 500 },
  { name: 'Wisdom Tooth Removal', cost: 3500 },
  { name: 'Scaling', cost: 600 },
  { name: 'Teeth Whitening', cost: 2000 },
  { name: 'Denture', cost: 12000 },
  { name: 'Gum Treatment', cost: 2500 },
]

const TOOTH_STATUSES = { HEALTHY: 'healthy', TREATED: 'treated', NEEDS_ATTENTION: 'needs-attention', MISSING: 'missing' }

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function weightedPick(options: { value: string; weight: number }[]): string {
  const total = options.reduce((s, o) => s + o.weight, 0)
  let r = Math.random() * total
  for (const o of options) { r -= o.weight; if (r <= 0) return o.value }
  return options[options.length - 1].value
}

function genPHMobile(): string {
  const prefix = pick(['0917', '0918', '0906', '0920', '0921', '0939', '0945', '0949', '0998'])
  const suffix = String(Math.floor(1000000 + Math.random() * 9000000))
  return prefix + suffix
}

function genPHAddress(): string {
  const street = faker.location.street()
  const barangay = pick(['Barangay Poblacion', 'Barangay San Jose', 'Barangay San Miguel', 'Barangay Santo Niño', 'Barangay San Isidro'])
  const city = pick(['Manila', 'Quezon City', 'Makati', 'Taguig', 'Pasig', 'Mandaluyong', 'Caloocan', 'Parañaque', 'Dasmariñas', 'Bacoor', 'Cebu City', 'Davao City'])
  const province = pick(['Metro Manila', 'Cavite', 'Laguna', 'Rizal', 'Bulacan', 'Cebu', 'Davao del Sur'])
  return `${street}, ${barangay}, ${city}, ${province}`
}

let totalStart = Date.now()

async function phasePatients(count: number) {
  const empty = await db.ref('patients').once('value')
  if (empty.exists() && Object.keys(empty.val()).length > 5) {
    console.log(`  Patients exist (${Object.keys(empty.val()).length}) — skip phase`)
    const patients: Array<{ patientId: string; userId: string; name: string; username: string }> = []
    for (const [pid, p] of Object.entries(empty.val() as Record<string, { name: string }>)) {
      const uname = p.name.toLowerCase().replace(/\s+/g, '.')
      patients.push({ patientId: pid, userId: 'seed', name: p.name, username: uname })
    }
    console.log(`  Loaded ${patients.length} existing patients\n`)
    return patients
  }

  const nowStr = now()
  const patientUpdates: Record<string, unknown> = {}
  const patients: Array<{ patientId: string; userId: string; name: string; username: string }> = []

  for (let i = 0; i < count; i++) {
    const firstName = pick(['Juan', 'Maria', 'Pedro', 'Ana', 'Jose', 'Rosa', 'Mario', 'Elena', 'Carlos', 'Luisa', 'Andres', 'Sofia', 'Ramon', 'Isabel', 'Antonio', 'Carmen', 'Manuel', 'Teresa', 'Rafael', 'Angela'])
    const lastName = pick(['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Mendoza', 'Flores', 'Villanueva', 'Bautista', 'Aquino', 'Fernandez', 'Lopez', 'Gonzales', 'Torres', 'Rivera', 'Cruz', 'Castillo', 'Domingo', 'Ramos', 'Alonzo', 'Vargas'])
    const name = `${firstName} ${lastName}`
    const username = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')
    const email = `${username}@email.com`
    const phone = genPHMobile()
    const dateOfBirth = `${faker.number.int({ min: 1950, max: 2005 })}-${String(faker.number.int({ min: 1, max: 12 })).padStart(2, '0')}-${String(faker.number.int({ min: 1, max: 28 })).padStart(2, '0')}`
    const address = genPHAddress()

    const pid = db.ref('patients').push().key
    patientUpdates[`patients/${pid}`] = { id: pid, name, phone, email, dateOfBirth, address, notes: '', createdAt: nowStr, updatedAt: nowStr }
    patients.push({ patientId: pid!, userId: 'seed', name, username })
  }

  await db.ref().update(patientUpdates)
  console.log(`  Patients done: ${patients.length} created in one batch\n`)
  return patients
}

async function phaseTeeth(patients: Array<{ patientId: string }>) {
  // Check if teeth already exist for first patient (idempotent)
  if (patients.length > 0) {
    const existing = await db.ref('teeth').orderByChild('patientId').equalTo(patients[0].patientId).limitToFirst(1).once('value')
    if (existing.exists()) { console.log('  Teeth exist — skip\n'); return }
  }
  const nowStr = now()
  const updates: Record<string, unknown> = {}
  for (const p of patients) {
    for (let n = 1; n <= 32; n++) {
      const id = db.ref('teeth').push().key
      updates[`teeth/${id}`] = { id, patientId: p.patientId, toothNumber: n, status: TOOTH_STATUSES.HEALTHY, notes: null, lastTreatment: null, lastTreatmentDate: null, createdAt: nowStr }
    }
  }
  await db.ref().update(updates)
  console.log(`  Teeth done: ${Object.keys(updates).length} total\n`)
}

function generateMonthSchedule(startDate: Date, patientIds: string[], userId: string) {
  const appointments: Array<{
    patientId: string; date: string; time: string; type: string; status: string; notes: string; createdBy: string
  }> = []
  const workingDays = 22
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
  ]

  // Track appointments per patient to enforce max 3 active at a time
  const activePerPatient = new Map<string, number>()

  for (let d = 0; d < workingDays; d++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + d)
    // Skip Sundays
    if (date.getDay() === 0) continue

    const dateStr = formatDate(date)

    // Morning: 4-6 slots
    const morningSlots = timeSlots.slice(0, 6)
    const morningCount = faker.number.int({ min: 3, max: 5 })
    const shuffledMorning = [...morningSlots].sort(() => Math.random() - 0.5).slice(0, morningCount)

    // Afternoon: 2-4 slots
    const afternoonSlots = timeSlots.slice(6)
    const afternoonCount = faker.number.int({ min: 2, max: 4 })
    const shuffledAfternoon = [...afternoonSlots].sort(() => Math.random() - 0.5).slice(0, afternoonCount)

    const daySlots = [...shuffledMorning, ...shuffledAfternoon].sort()

    for (const time of daySlots) {
      // Pick a patient who isn't at max active appointments
      let patientId: string
      let attempts = 0
      do {
        patientId = pick(patientIds)
        attempts++
      } while ((activePerPatient.get(patientId) || 0) >= 3 && attempts < 20)
      if (attempts >= 20) continue

      const typeWeight = weightedPick([
        { value: 'checkup', weight: 20 },
        { value: 'cleaning', weight: 25 },
        { value: 'filling', weight: 20 },
        { value: 'extraction', weight: 10 },
        { value: 'root-canal', weight: 5 },
        { value: 'crown', weight: 5 },
        { value: 'other', weight: 15 },
      ])

      const statusRoll = Math.random()
      let status: string
      if (date > new Date()) {
        status = 'scheduled'
        activePerPatient.set(patientId, (activePerPatient.get(patientId) || 0) + 1)
      } else if (statusRoll < 0.05) {
        status = 'no-show'
      } else if (statusRoll < 0.10) {
        status = 'cancelled'
      } else {
        status = 'completed'
      }

      const notes = Math.random() < 0.4
        ? pick(['Patient reported mild discomfort', 'Follow-up required in 2 weeks', 'Referred for X-ray', 'No notable issues', 'Slight gum inflammation detected', 'Patient advised on oral hygiene'])
        : ''

      appointments.push({ patientId, date: dateStr, time, type: typeWeight, status, notes, createdBy: userId })
    }
  }

  return appointments
}

async function phaseAppointments(patients: Array<{ patientId: string; userId: string }>) {
  if (patients.length > 0) {
    const existing = await db.ref('appointments').orderByChild('patientId').equalTo(patients[0].patientId).limitToFirst(1).once('value')
    if (existing.exists()) { console.log('  Appointments exist — skip\n'); return [] }
  }

  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 45)
  const patientIds = patients.map(p => p.patientId)
  const dentistUserId = patients.length > 0 ? patients[0].userId : 'seed'

  const allAppointments = generateMonthSchedule(pastDate, patientIds, dentistUserId)
  const completed: typeof allAppointments = []
  const others: typeof allAppointments = []

  for (const a of allAppointments) {
    if (a.status === 'completed' || a.status === 'no-show' || a.status === 'cancelled') completed.push(a)
    else others.push(a)
  }

  // Write in batches of 100
  let written = 0
  const BATCH = 100
  for (let i = 0; i < completed.length; i += BATCH) {
    const batch = completed.slice(i, i + BATCH)
    const updates: Record<string, unknown> = {}
    for (const a of batch) {
      const id = db.ref('appointments').push().key
      updates[`appointments/${id}`] = { ...a, date: new Date(a.date), id, createdAt: now(), updatedAt: now() }
    }
    await db.ref().update(updates)
    written += batch.length
    console.log(`  Appointments (past): ${written}/${completed.length}`)
  }

  for (let i = 0; i < others.length; i += BATCH) {
    const batch = others.slice(i, i + BATCH)
    const updates: Record<string, unknown> = {}
    for (const a of batch) {
      const id = db.ref('appointments').push().key
      updates[`appointments/${id}`] = { ...a, date: new Date(a.date), id, createdAt: now(), updatedAt: now() }
    }
    await db.ref().update(updates)
    written += batch.length
    console.log(`  Appointments (future): ${written - completed.length}/${others.length}`)
  }

  console.log(`  Appointments done: ${written} total\n`)
  return completed
}

async function phaseTreatments(patients: Array<{ patientId: string; name: string }>, completedAppts: Array<{ patientId: string; type: string; date: string; time: string; status: string }>) {
  if (patients.length > 0) {
    const existing = await db.ref('treatments').orderByChild('patientId').equalTo(patients[0].patientId).limitToFirst(1).once('value')
    if (existing.exists()) { console.log('  Treatments exist — skip\n'); return }
  }
  let count = 0
  const treatments: Array<Record<string, unknown>> = []
  // Track which teeth to update
  const toothUpdates: Record<string, { patientId: string; toothNumber: number; status: string; procedure: string }> = {}

  for (const appt of completedAppts) {
    if (appt.status !== 'completed') continue
    if (Math.random() > 0.6) continue // ~60% of completed appts get a treatment

    const patient = patients.find(p => p.patientId === appt.patientId)
    if (!patient) continue

    const toothNumber = faker.number.int({ min: 1, max: 32 })
    const proc = pick(PROCEDURES)
    const isPaid = Math.random() < 0.65
    const paidAt = isPaid ? new Date(appt.date) : null
    const txn: Record<string, unknown> = {
      patientId: appt.patientId,
      toothNumber,
      procedure: proc.name,
      notes: Math.random() < 0.5 ? pick(['Patient tolerated well', 'Follow-up scheduled', 'Minor bleeding, resolved', 'Prescribed antibiotics', 'Slight swelling noted']) : '',
      cost: proc.cost,
      followUpDate: Math.random() < 0.3 ? daysFromNow(faker.number.int({ min: 10, max: 60 })) : null,
      date: new Date(appt.date),
      dentistId: 'seed',
      dentistName: 'Dr. Amara Reyes',
      paid: isPaid,
      paidAt,
      paidBy: isPaid ? (Math.random() < 0.5 ? 'Marco Dela Cruz' : null) : null,
      paymentMethod: isPaid ? pick(['cash', 'card', 'insurance', 'bank-transfer']) : null,
      paidAmount: isPaid ? proc.cost : null,
    }
    treatments.push(txn)

    // Mark tooth as treated or needs-attention
    if (!toothUpdates[`${appt.patientId}-${toothNumber}`]) {
      toothUpdates[`${appt.patientId}-${toothNumber}`] = {
        patientId: appt.patientId,
        toothNumber,
        status: TOOTH_STATUSES.TREATED,
        procedure: proc.name,
      }
    }
  }

  // Write treatments in batches
  const BATCH = 50
  for (let i = 0; i < treatments.length; i += BATCH) {
    const batch = treatments.slice(i, i + BATCH)
    const updates: Record<string, unknown> = {}
    for (const t of batch) {
      const id = db.ref('treatments').push().key
      updates[`treatments/${id}`] = { ...t, id, createdAt: now(), updatedAt: now() }
    }
    await db.ref().update(updates)
    count += batch.length
    console.log(`  Treatments: ${count}/${treatments.length}`)
  }

  // Update tooth records — single read, batch write
  let toothCount = 0
  const toothKeys = Object.values(toothUpdates)
  if (toothKeys.length > 0) {
    const allTeethSnap = await db.ref('teeth').once('value')
    const toothMap: Record<string, string> = {}
    if (allTeethSnap.exists()) {
      for (const [k, v] of Object.entries(allTeethSnap.val() as Record<string, { patientId: string; toothNumber: number }>)) {
        toothMap[`${v.patientId}-${v.toothNumber}`] = k
      }
    }
    const updates: Record<string, unknown> = {}
    for (const t of toothKeys) {
      const key = toothMap[`${t.patientId}-${t.toothNumber}`]
      if (key) {
        updates[`teeth/${key}/status`] = t.status
        updates[`teeth/${key}/lastTreatment`] = t.procedure
        updates[`teeth/${key}/lastTreatmentDate`] = now()
        toothCount++
      }
    }
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates)
    }
  }

  console.log(`  Treatments done: ${count} created, ${toothCount} teeth updated\n`)
}

async function showSummary() {
  const snap = await db.ref('/').once('value')
  if (!snap.exists()) return
  const data = snap.val()
  console.log('────────────────────────────────────')
  console.log('  patients: ' + (data.patients ? Object.keys(data.patients).length : 0))
  console.log('  teeth: ' + (data.teeth ? Object.keys(data.teeth).length : 0))
  console.log('  appointments: ' + (data.appointments ? Object.keys(data.appointments).length : 0))
  console.log('  treatments: ' + (data.treatments ? Object.keys(data.treatments).length : 0))
  console.log('────────────────────────────────────')
  const elapsed = ((Date.now() - totalStart) / 1000).toFixed(1)
  console.log(`\nDuration: ${elapsed}s`)
  console.log('\nSeed complete. First Google sign-in gets dentist role.')
}

async function main() {
  console.log('Seeding busy month...\n')
  totalStart = Date.now()

  const rootSnap = await db.ref('/').once('value')
  if (rootSnap.exists()) {
    const rootKeys = Object.keys(rootSnap.val())
    const nonEmpty = rootKeys.filter(k => Object.keys(rootSnap.val()[k] || {}).length > 0)
    if (nonEmpty.length > 0) {
      console.log(`WARNING: DB has data in ${nonEmpty.join(', ')}.`)
      console.log('Run `npm run wipe` first to clear, or existing data may accumulate.\n')
    }
  }

  const patients = await phasePatients(28)
  await phaseTeeth(patients)
  const completed = await phaseAppointments(patients)
  const completedAppts = completed.filter((a: any) => a.status === 'completed').map((a: any) => ({
    patientId: a.patientId,
    type: a.type,
    date: a.date,
    time: a.time,
    status: a.status,
  }))
  await phaseTreatments(patients, completedAppts)
  await showSummary()
}

main().then(() => process.exit(0)).catch((err) => { console.error('Seed failed:', err); process.exit(1) })
