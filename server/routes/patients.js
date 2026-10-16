const { Router } = require('express')
const { db, loadServiceAccount } = require('../db')
const { authenticate, requireRole, withErrors } = require('../middleware')
const { patientFormSchema, patientXraySchema, handleValidationError } = require('../validate').default
const { PAGINATION_DEFAULTS, ROLES, TOTAL_TEETH, TOOTH_STATUSES } = require('../constants')
const { getStorage } = require('firebase-admin/storage')
const crypto = require('crypto')

const router = Router()

const EXT_CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

// Resolve the storage bucket lazily: env override, then the two possible
// default bucket names. Cached after first success; retried after failure
// so enabling Storage in the console works without a server restart.
let bucketPromise = null
function getBucket() {
  if (!bucketPromise) {
    bucketPromise = (async () => {
      const sa = loadServiceAccount()
      const candidates = [
        process.env.FIREBASE_STORAGE_BUCKET,
        `${sa.project_id}.firebasestorage.app`,
        `${sa.project_id}.appspot.com`,
      ].filter(Boolean)
      for (const name of candidates) {
        const bucket = getStorage().bucket(name)
        const [exists] = await bucket.exists()
        if (exists) return bucket
      }
      throw new Error('No Firebase Storage bucket found. Enable Storage in the Firebase console.')
    })().catch((err) => {
      bucketPromise = null
      throw err
    })
  }
  return bucketPromise
}

// GET /api/patients?search=&page=&limit=
router.get('/', authenticate, withErrors(async (req, res) => {
  const searchParam = (req.query.search || '').trim()
  const rawPage = Number(req.query.page || PAGINATION_DEFAULTS.PAGE)
  const rawLimit = Number(req.query.limit || PAGINATION_DEFAULTS.LIMIT)

  const page =
    Number.isFinite(rawPage) && rawPage > 0
      ? Math.floor(rawPage)
      : PAGINATION_DEFAULTS.PAGE
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), PAGINATION_DEFAULTS.MAX_LIMIT)
      : PAGINATION_DEFAULTS.LIMIT

  const where = {}
  if (searchParam) {
    where.name = { contains: searchParam }
  }

  const [total, patients] = await Promise.all([
    db.patient.count({ where }),
    db.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return res.json({
    data: patients,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
}))

// POST /api/patients
router.post('/', authenticate, requireRole(ROLES.DENTIST, ROLES.CASHIER), withErrors(async (req, res) => {
  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = patientFormSchema.safeParse(body)
  if (!parsed.success) return handleValidationError(res, parsed.error)

  const created = await db.patient.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      dateOfBirth: parsed.data.dateOfBirth,
      address: parsed.data.address ?? '',
      notes: parsed.data.notes ?? '',
    },
  })

  await db.tooth.createMany({
    data: Array.from({ length: TOTAL_TEETH }, (_, i) => ({
      patientId: created.id,
      toothNumber: i + 1,
      status: TOOTH_STATUSES.HEALTHY,
      notes: null,
    })),
  })

  return res.status(201).json(created)
}))

// GET /api/patients/:id
router.get('/:id', authenticate, withErrors(async (req, res) => {
  const patient = await db.patient.findUnique({ where: { id: req.params.id } })
  if (!patient) return res.status(404).json({ error: 'Patient not found' })
  return res.json(patient)
}))

// PUT /api/patients/:id
router.put('/:id', authenticate, requireRole(ROLES.DENTIST, ROLES.CASHIER), withErrors(async (req, res) => {
  const { id } = req.params

  const existing = await db.patient.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Patient not found' })

  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = patientFormSchema.safeParse(body)
  if (!parsed.success) return handleValidationError(res, parsed.error)

  const updated = await db.patient.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      dateOfBirth: parsed.data.dateOfBirth,
      address: parsed.data.address ?? '',
      notes: parsed.data.notes ?? '',
      updatedAt: new Date(),
    },
  })

  return res.json(updated)
}))

// PUT /api/patients/:id/xray
router.put('/:id/xray', authenticate, requireRole(ROLES.DENTIST), withErrors(async (req, res) => {
  const { id } = req.params

  const existing = await db.patient.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Patient not found' })

  const parsed = patientXraySchema.safeParse(req.body)
  if (!parsed.success) return handleValidationError(res, parsed.error)

  const { xrayData, xrayFilename, removeXray } = parsed.data

  let xrayUrl
  if (xrayData) {
    const ext = (xrayFilename || '').match(/\.(png|jpe?g|webp)$/i)?.[0]?.toLowerCase() || '.png'
    const base64 = xrayData.replace(/^data:image\/\w+;base64,/, '')
    const bucket = await getBucket()
    const token = crypto.randomUUID()
    const file = bucket.file(`xrays/patient_${id}_${crypto.randomBytes(6).toString('hex')}${ext}`)
    await file.save(Buffer.from(base64, 'base64'), {
      contentType: EXT_CONTENT_TYPES[ext] || 'image/png',
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    })
    xrayUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`
  }

  if (!xrayUrl && !removeXray) {
    return res.status(400).json({ error: 'Nothing to update' })
  }

  const updated = await db.patient.update({
    where: { id },
    data: {
      ...(removeXray && { xrayUrl: null }),
      ...(xrayUrl && { xrayUrl }),
      updatedAt: new Date(),
    },
  })

  return res.json(updated)
}))

// DELETE /api/patients/:id
router.delete('/:id', authenticate, requireRole(ROLES.DENTIST, ROLES.CASHIER), withErrors(async (req, res) => {
  const { id } = req.params

  const existing = await db.patient.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Patient not found' })

  await db.tooth.deleteMany({ where: { patientId: id } })
  await db.treatment.deleteMany({ where: { patientId: id } })
  await db.appointment.deleteMany({ where: { patientId: id } })
  await db.patient.delete({ where: { id } })

  return res.json({ success: true })
}))

module.exports = router
