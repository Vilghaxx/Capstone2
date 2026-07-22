const { Router } = require('express')
const { db } = require('../db')
const { authenticate, requireRole, withErrors } = require('../middleware')
const { appointmentFormSchema, appointmentUpdateSchema, handleValidationError } = require('../validate')
const { APPOINTMENT_STATUSES, ROLES } = require('../constants')

const router = Router()

// GET /api/appointments?status=&date=
router.get('/', authenticate, requireRole(ROLES.DENTIST, ROLES.CASHIER, ROLES.PATIENT), withErrors(async (req, res) => {
  const status = (req.query.status || '').trim() || undefined
  const date = (req.query.date || '').trim() || undefined

  const where = {}

  if (req.user.role === ROLES.PATIENT) {
    if (!req.user.patientRef) return res.json([])
    where.patientId = req.user.patientRef
  }

  if (status) {
    where.status = status
  }

  if (date) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`)
    if (Number.isNaN(startOfDay.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' })
    }
    const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
    where.date = { gte: startOfDay, lt: startOfNextDay }
  }

  const appointments = await db.appointment.findMany({
    where,
    orderBy: { date: 'asc' },
  })

  return res.json(appointments)
}))

// POST /api/appointments
router.post('/', authenticate, requireRole(ROLES.DENTIST, ROLES.CASHIER, ROLES.PATIENT), withErrors(async (req, res) => {
  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = appointmentFormSchema.safeParse(body)
  if (!parsed.success) {
    return handleValidationError(res, parsed.error)
  }
  const data = parsed.data

  let patientId
  let status

  if (req.user.role === ROLES.PATIENT) {
    if (!req.user.patientRef) {
      return res.status(400).json({ error: 'Patient account is not linked to a patient record.' })
    }
    patientId = req.user.patientRef
    status = APPOINTMENT_STATUSES.PENDING
  } else {
    patientId = data.patientId
    status = data.status || APPOINTMENT_STATUSES.SCHEDULED
  }

  const parsedDate = new Date(data.date)
  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format.' })
  }

  const patient = await db.patient.findUnique({ where: { id: patientId } })
  if (!patient) return res.status(404).json({ error: 'Patient not found' })

  const created = await db.appointment.create({
    data: {
      patientId,
      date: parsedDate,
      time: data.time,
      type: data.type,
      status,
      notes: data.notes ?? '',
      createdBy: req.user.sub,
    },
  })

  return res.status(201).json(created)
}))

// GET /api/appointments/:id
router.get('/:id', authenticate, requireRole(ROLES.DENTIST, ROLES.CASHIER, ROLES.PATIENT), withErrors(async (req, res) => {
  const { id } = req.params

  const appointment = await db.appointment.findUnique({ where: { id } })
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' })

  if (req.user.role === ROLES.PATIENT && appointment.patientId !== req.user.patientRef) {
    return res.status(403).json({ error: 'You can only view your own appointments' })
  }

  return res.json(appointment)
}))

// PUT /api/appointments/:id
router.put('/:id', authenticate, requireRole(ROLES.DENTIST, ROLES.CASHIER), withErrors(async (req, res) => {
  const { id } = req.params

  const existing = await db.appointment.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Appointment not found' })

  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = appointmentUpdateSchema.safeParse(body)
  if (!parsed.success) return handleValidationError(res, parsed.error)

  const { status, notes, time, type, date } = parsed.data

  const data = {}
  if (status !== undefined) data.status = status
  if (notes !== undefined) data.notes = notes
  if (time !== undefined) data.time = time
  if (type !== undefined) data.type = type
  if (date !== undefined) {
    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' })
    }
    data.date = parsedDate
  }

  if (Object.keys(data).length === 0) {
    return res.json(existing)
  }

  const updated = await db.appointment.update({
    where: { id },
    data,
  })

  return res.json(updated)
}))

// DELETE /api/appointments/:id
router.delete('/:id', authenticate, requireRole(ROLES.DENTIST), withErrors(async (req, res) => {
  const { id } = req.params

  const existing = await db.appointment.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Appointment not found' })

  await db.appointment.delete({ where: { id } })

  return res.json({ success: true })
}))

module.exports = router
