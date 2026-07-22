const { Router } = require('express')
const { db } = require('../db')
const { authenticate, requireRole, withErrors } = require('../middleware')
const { treatmentFormSchema, treatmentUpdateSchema, handleValidationError } = require('../validate')
const { ROLES, TOOTH_STATUSES } = require('../constants')

const router = Router()

// POST /api/treatments
router.post('/', authenticate, requireRole(ROLES.DENTIST), withErrors(async (req, res) => {
  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = treatmentFormSchema.safeParse(body)
  if (!parsed.success) {
    return handleValidationError(res, parsed.error)
  }

  const { patientId, toothNumber, procedure, notes, cost, followUpDate } = parsed.data

  const patient = await db.patient.findUnique({ where: { id: patientId } })
  if (!patient) return res.status(404).json({ error: 'Patient not found' })

  const treatment = await db.$transaction(async (tx) => {
    const created = await tx.treatment.create({
      data: {
        patientId,
        toothNumber,
        procedure,
        notes,
        cost,
        followUpDate: followUpDate ?? null,
        date: new Date(),
        dentistId: req.user.sub,
        dentistName: req.user.name,
        paid: false,
      },
    })

    await tx.tooth.upsert({
      where: { patientId_toothNumber: { patientId, toothNumber } },
      update: {
        status: TOOTH_STATUSES.TREATED,
        lastTreatment: procedure,
        lastTreatmentDate: new Date(),
      },
      create: {
        patientId,
        toothNumber,
        status: TOOTH_STATUSES.TREATED,
        lastTreatment: procedure,
        lastTreatmentDate: new Date(),
      },
    })

    return created
  })

  return res.status(201).json(treatment)
}))

// GET /api/treatments/:id (patientId)
router.get('/:id', authenticate, withErrors(async (req, res) => {
  const patientId = req.params.id

  const treatments = await db.treatment.findMany({
    where: { patientId },
    orderBy: { date: 'desc' },
  })

  return res.json(treatments)
}))

// PUT /api/treatments/:id (treatment id)
router.put('/:id', authenticate, requireRole(ROLES.DENTIST), withErrors(async (req, res) => {
  const { id } = req.params

  const existing = await db.treatment.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Treatment not found' })

  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = treatmentUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return handleValidationError(res, parsed.error)
  }

  const updated = await db.treatment.update({
    where: { id },
    data: parsed.data,
  })

  return res.json(updated)
}))

// GET /api/treatments/tooth/:patientId/:toothNumber
router.get('/tooth/:patientId/:toothNumber', authenticate, withErrors(async (req, res) => {
  const { patientId, toothNumber } = req.params
  const toothNum = Number(toothNumber)
  if (Number.isNaN(toothNum)) {
    return res.json([])
  }

  const treatments = await db.treatment.findMany({
    where: { patientId, toothNumber: toothNum },
    orderBy: { date: 'desc' },
  })

  return res.json(treatments)
}))

module.exports = router
