const { Router } = require('express')
const { db } = require('../db')
const { authenticate, requireRole, withErrors } = require('../middleware')
const { paymentFormSchema, handleValidationError } = require('../validate')
const { ROLES } = require('../constants')

const router = Router()

// GET /api/billing?status=&patientId=
router.get('/', authenticate, requireRole(ROLES.DENTIST, ROLES.CASHIER, ROLES.PATIENT), withErrors(async (req, res) => {
  const status = req.query.status
  const patientId = req.query.patientId

  const where = {}

  if (status === 'paid') where.paid = true
  else if (status === 'unpaid') where.paid = false
  if (patientId) where.patientId = patientId

  const treatments = await db.treatment.findMany({
    where,
    orderBy: { date: 'desc' },
  })

  const patientIds = Array.from(new Set(treatments.map((t) => t.patientId)))
  const patients =
    patientIds.length > 0
      ? await db.patient.findMany({
          where: { id: { in: patientIds } },
          select: { id: true, name: true },
        })
      : []
  const patientMap = new Map(patients.map((p) => [p.id, p.name]))

  const data = treatments.map((t) => ({
    ...t,
    patientName: patientMap.get(t.patientId) ?? null,
  }))

  return res.json(data)
}))

// GET /api/billing/summary
router.get('/summary', authenticate, withErrors(async (req, res) => {
  const [allAgg, paidAgg, unpaidAgg] = await Promise.all([
    db.treatment.aggregate({ _sum: { cost: true }, _count: true }),
    db.treatment.aggregate({ _sum: { cost: true }, _count: true, where: { paid: true } }),
    db.treatment.aggregate({ _sum: { cost: true }, _count: true, where: { paid: false } }),
  ])

  return res.json({
    totalRevenue: allAgg._sum.cost ?? 0,
    collected: paidAgg._sum.cost ?? 0,
    unpaid: unpaidAgg._sum.cost ?? 0,
    treatmentCount: allAgg._count,
    paidCount: paidAgg._count,
    unpaidCount: unpaidAgg._count,
  })
}))

// GET /api/billing/:id  (patientId)
router.get('/:id', authenticate, withErrors(async (req, res) => {
  const patientId = req.params.id

  const [treatments, allAgg, paidAgg] = await Promise.all([
    db.treatment.findMany({ where: { patientId }, orderBy: { date: 'desc' } }),
    db.treatment.aggregate({ _sum: { cost: true }, _count: true, where: { patientId } }),
    db.treatment.aggregate({ _sum: { cost: true }, where: { patientId, paid: true } }),
  ])

  const totalCost = allAgg._sum.cost ?? 0
  const paid = paidAgg._sum.cost ?? 0
  const unpaid = totalCost - paid

  return res.json({
    data: treatments,
    summary: { totalCost, paid, unpaid, count: allAgg._count },
  })
}))

// PUT /api/billing/:id/pay
router.put('/:id/pay', authenticate, requireRole(ROLES.DENTIST, ROLES.CASHIER), withErrors(async (req, res) => {
  const treatmentId = req.params.id

  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = paymentFormSchema.safeParse(body)
  if (!parsed.success) return handleValidationError(res, parsed.error)

  const { paymentMethod, paidAmount } = parsed.data

  const existing = await db.treatment.findUnique({ where: { id: treatmentId } })
  if (!existing) return res.status(404).json({ error: 'Treatment not found' })

  const updated = await db.treatment.update({
    where: { id: treatmentId },
    data: {
      paid: true,
      paidAt: new Date(),
      paidBy: req.user.name,
      paymentMethod,
      paidAmount,
    },
  })

  return res.json(updated)
}))

module.exports = router
