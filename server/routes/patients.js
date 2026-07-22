const { Router } = require('express')
const { db } = require('../db')
const { authenticate, requireRole, withErrors } = require('../middleware')
const { patientFormSchema, handleValidationError } = require('../validate')
const { PAGINATION_DEFAULTS, ROLES, TOTAL_TEETH, TOOTH_STATUSES } = require('../constants')

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
