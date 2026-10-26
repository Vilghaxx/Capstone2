const { Router } = require('express')
const { db } = require('../db')
const { authenticate, requireRole, withErrors } = require('../middleware')
const { patientFormSchema, patientXraySchema, handleValidationError } = require('../validate').default
const { PAGINATION_DEFAULTS, ROLES, PERMANENT_TEETH, TOOTH_STATUSES } = require('../constants')

const router = Router()

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

  const [total, raw] = await Promise.all([
    db.patient.count({ where }),
    db.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  // X-ray image payloads are stripped from list responses; the profile page
  // fetches the full record with GET /:id.
  const patients = raw.map(({ xrayUrl, xrays, ...patient }) => patient)

  return res.json({
    data: patients,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
}))

// POST /api/patients
router.post('/', authenticate, requireRole(ROLES.DENTIST, ROLES.ASSISTANT), withErrors(async (req, res) => {
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
    data: PERMANENT_TEETH.map((toothNumber) => ({
      patientId: created.id,
      toothNumber,
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
router.put('/:id', authenticate, requireRole(ROLES.DENTIST, ROLES.ASSISTANT), withErrors(async (req, res) => {
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
// Patient X-rays are an array of data URLs on `xrays` (max XRAY_LIMIT).
// `xrayData` appends, `removeXrayIndex` removes one, `removeXray` clears all.
// Legacy single-image `xrayUrl` patients are migrated to the array on first
// edit; the legacy key is then replaced.
const XRAY_LIMIT = 10

// Mutate the X-ray list for one patient per the parsed body. Returns
// { next } on success or { error } when the edit is invalid.
function applyXrayEdit(existing, { xrayData, removeXray, removeXrayIndex }) {
  // Guard against RTDB occasionally object-encoding stored arrays.
  const xrays = Array.isArray(existing.xrays)
    ? existing.xrays.filter(Boolean)
    : existing.xrays && typeof existing.xrays === 'object'
      ? Object.values(existing.xrays).filter(Boolean)
      : existing.xrayUrl
        ? [existing.xrayUrl]
        : []

  let next = [...xrays]
  if (removeXray) next = []
  if (removeXrayIndex !== undefined) {
    if (removeXrayIndex >= next.length) {
      return { error: 'Invalid X-ray index' }
    }
    next.splice(removeXrayIndex, 1)
  }
  if (xrayData) {
    if (next.length >= XRAY_LIMIT) {
      return { error: `X-ray attachments are limited to ${XRAY_LIMIT} images` }
    }
    next.push(xrayData)
  }
  return { next }
}

router.put('/:id/xray', authenticate, requireRole(ROLES.DENTIST), withErrors(async (req, res) => {
  const { id } = req.params

  const existing = await db.patient.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Patient not found' })

  const parsed = patientXraySchema.safeParse(req.body)
  if (!parsed.success) return handleValidationError(res, parsed.error)

  const { xrayData, removeXray, removeXrayIndex } = parsed.data

  if (!xrayData && removeXrayIndex === undefined && !removeXray) {
    return res.status(400).json({ error: 'Nothing to update' })
  }

  const edit = applyXrayEdit(existing, { xrayData, removeXray, removeXrayIndex })
  if (edit.error) return res.status(400).json({ error: edit.error })

  const updated = await db.patient.update({
    where: { id },
    data: {
      xrays: edit.next.length ? edit.next : null,
      // The single-image field remains only for legacy records; the array now owns the data.
      xrayUrl: null,
      updatedAt: new Date(),
    },
  })

  return res.json(updated)
}))

// DELETE /api/patients/:id
router.delete('/:id', authenticate, requireRole(ROLES.DENTIST, ROLES.ASSISTANT), withErrors(async (req, res) => {
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
module.exports.applyXrayEdit = applyXrayEdit
module.exports.XRAY_LIMIT = XRAY_LIMIT
