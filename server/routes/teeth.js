const { Router } = require('express')
const { db } = require('../db')
const { authenticate, requireRole, withErrors } = require('../middleware')
const { toothUpdateSchema, handleValidationError } = require('../validate')
const { ROLES } = require('../constants')

const router = Router()

// GET /api/teeth/:patientId
router.get('/:patientId', authenticate, requireRole(ROLES.DENTIST, ROLES.CASHIER, ROLES.PATIENT), withErrors(async (req, res) => {
  const { patientId } = req.params

  const teeth = await db.tooth.findMany({
    where: { patientId },
    orderBy: { toothNumber: 'asc' },
  })

  return res.json(teeth)
}))

// GET /api/teeth/:patientId/:toothNumber
router.get('/:patientId/:toothNumber', authenticate, requireRole(ROLES.DENTIST, ROLES.CASHIER, ROLES.PATIENT), withErrors(async (req, res) => {
  const { patientId, toothNumber } = req.params
  const toothNumberNum = Number(toothNumber)
  if (Number.isNaN(toothNumberNum)) {
    return res.status(404).json({ error: 'Invalid tooth number' })
  }

  const tooth = await db.tooth.findUnique({
    where: { patientId_toothNumber: { patientId, toothNumber: toothNumberNum } },
  })

  if (!tooth) return res.status(404).json({ error: 'Tooth not found' })
  return res.json(tooth)
}))

// PUT /api/teeth/:patientId/:toothNumber
router.put('/:patientId/:toothNumber', authenticate, requireRole(ROLES.DENTIST), withErrors(async (req, res) => {
  const { patientId, toothNumber } = req.params
  const toothNumberNum = Number(toothNumber)
  if (Number.isNaN(toothNumberNum)) {
    return res.status(404).json({ error: 'Invalid tooth number' })
  }

  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = toothUpdateSchema.safeParse(body)
  if (!parsed.success) return handleValidationError(res, parsed.error)

  const { status, notes } = parsed.data

  const tooth = await db.tooth.upsert({
    where: { patientId_toothNumber: { patientId, toothNumber: toothNumberNum } },
    update: {
      status,
      notes: notes ?? null,
      updatedAt: new Date(),
    },
    create: {
      patientId,
      toothNumber: toothNumberNum,
      status,
      notes: notes ?? null,
    },
  })

  return res.json(tooth)
}))

module.exports = router
