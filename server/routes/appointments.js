const { Router } = require('express')
const { db } = require('../db')
const { authenticate, requireRole, withErrors } = require('../middleware')
const { appointmentFormSchema, appointmentUpdateSchema, patientAppointmentUpdateSchema, handleValidationError } = require('../validate').default
const { APPOINTMENT_STATUSES, ROLES } = require('../constants')
const { sendAppointmentScheduledEmail } = require('../mailer')

async function hasSlotConflict(date, time, excludeId) {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start.getTime() + 86_400_000)
  const appts = await db.appointment.findMany({
    where: {
      date: { gte: start, lt: end },
      time,
      status: { in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.SCHEDULED] },
    },
  })
  return excludeId
    ? appts.some(a => a.id !== excludeId)
    : appts.length > 0
}

// Patient cancellations close 2 hours before the appointment start.
// Stored dates are UTC midnight while times are clinic wall-clock (UTC+8).
const CANCELLATION_CUTOFF_MS = 2 * 60 * 60 * 1000
const CLINIC_UTC_OFFSET = '+08:00'

function isCancellationClosed(appointment, now = Date.now()) {
  const date = appointment.date instanceof Date ? appointment.date : new Date(appointment.date)
  if (Number.isNaN(date.getTime()) || !appointment.time) return false
  const start = new Date(`${date.toISOString().slice(0, 10)}T${appointment.time}:00${CLINIC_UTC_OFFSET}`)
  if (Number.isNaN(start.getTime())) return false
  return now >= start.getTime() - CANCELLATION_CUTOFF_MS
}

const router = Router()

// GET /api/appointments?status=&date=
router.get('/', authenticate, requireRole(ROLES.DENTIST, ROLES.ASSISTANT, ROLES.PATIENT), withErrors(async (req, res) => {
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

const SCHEDULE_VISIBLE_STATUSES = new Set([
  APPOINTMENT_STATUSES.SCHEDULED,
  APPOINTMENT_STATUSES.COMPLETED,
])

// GET /api/schedule?date=YYYY-MM-DD — public time-slot view for patients
router.get('/schedule', authenticate, requireRole(ROLES.DENTIST, ROLES.ASSISTANT, ROLES.PATIENT), withErrors(async (req, res) => {
  const date = (req.query.date || '').trim()
  if (!date) return res.status(400).json({ error: 'date query parameter is required.' })

  const startOfDay = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(startOfDay.getTime())) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' })
  }
  const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const appointments = await db.appointment.findMany({
    where: {
      date: { gte: startOfDay, lt: startOfNextDay },
    },
    orderBy: { time: 'asc' },
  })

  const visible = appointments.filter(a => SCHEDULE_VISIBLE_STATUSES.has(a.status))
  // Time slots blocked by pending appointments (hide entirely from schedule board)
  const blockedSlots = new Set(
    appointments
      .filter(a => a.status === APPOINTMENT_STATUSES.PENDING)
      .map(a => a.time)
  )

  if (req.user.role === ROLES.PATIENT) {
    return res.json({
      appointments: visible.map(a => ({ id: a.id, time: a.time, type: a.type, status: a.status })),
      blockedSlots: Array.from(blockedSlots),
    })
  }

  return res.json({
    appointments: visible,
    blockedSlots: Array.from(blockedSlots),
  })
}))

// POST /api/appointments
router.post('/', authenticate, requireRole(ROLES.DENTIST, ROLES.ASSISTANT, ROLES.PATIENT), withErrors(async (req, res) => {
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

  if (req.user.role === ROLES.PATIENT) {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30)
    if (parsedDate > maxDate) {
      return res.status(400).json({
        error: 'Appointments can only be booked up to 30 days in advance.',
      })
    }
  }

  const patient = await db.patient.findUnique({ where: { id: patientId } })
  if (!patient) return res.status(404).json({ error: 'Patient not found' })

  if (req.user.role === ROLES.PATIENT && !patient.phone) {
    return res.status(400).json({
      error: 'Please add a phone number to your profile before booking an appointment.',
    })
  }

  const activeAppts = await db.appointment.findMany({
    where: {
      patientId,
      status: { in: [APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.SCHEDULED] },
    },
  })
  if (activeAppts.length >= 3) {
    return res.status(400).json({
      error: 'You can have at most 3 active appointments at a time.',
    })
  }

  if (await hasSlotConflict(parsedDate, data.time)) {
    return res.status(400).json({
      error: 'This time slot is already taken.',
    })
  }

  const created = await db.appointment.create({
    data: {
      patientId,
      date: parsedDate,
      time: data.time,
      type: data.type,
      status,
      notes: data.notes ?? '',
      paymentMethod: data.paymentMethod ?? 'pay',
      hmoCompany: data.hmoCompany ?? '',
      hmoProvider: data.hmoProvider ?? '',
      hmoInsuranceNo: data.hmoInsuranceNo ?? '',
      hmoAccountNo: data.hmoAccountNo ?? '',
      hmoBirthDate: data.hmoBirthDate ?? '',
      createdBy: req.user.sub,
    },
  })

  return res.status(201).json(created)
}))

// GET /api/appointments/:id
router.get('/:id', authenticate, requireRole(ROLES.DENTIST, ROLES.ASSISTANT, ROLES.PATIENT), withErrors(async (req, res) => {
  const { id } = req.params

  const appointment = await db.appointment.findUnique({ where: { id } })
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' })

  if (req.user.role === ROLES.PATIENT && appointment.patientId !== req.user.patientRef) {
    return res.status(403).json({ error: 'You can only view your own appointments' })
  }

  return res.json(appointment)
}))

// PUT /api/appointments/:id
router.put('/:id', authenticate, requireRole(ROLES.DENTIST, ROLES.ASSISTANT, ROLES.PATIENT), withErrors(async (req, res) => {
  const { id } = req.params

  const existing = await db.appointment.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Appointment not found' })

  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  // Patient branch: own appointments only, restricted fields
  if (req.user.role === ROLES.PATIENT) {
    if (existing.patientId !== req.user.patientRef) {
      return res.status(403).json({ error: 'You can only modify your own appointments' })
    }

    const parsed = patientAppointmentUpdateSchema.safeParse(body)
    if (!parsed.success) return handleValidationError(res, parsed.error)

    const { status, notes, time, type, date } = parsed.data
    const editingFields = date !== undefined || time !== undefined || type !== undefined || notes !== undefined
    const cancelling = status === APPOINTMENT_STATUSES.CANCELLED

    // Editing fields requires pending status
    if (editingFields && existing.status !== APPOINTMENT_STATUSES.PENDING) {
      return res.status(403).json({ error: 'Only pending appointments can be edited' })
    }
    // Cancelling requires pending or scheduled
    if (cancelling && ![APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.SCHEDULED].includes(existing.status)) {
      return res.status(403).json({ error: 'This appointment cannot be cancelled at this stage' })
    }
    // Cancelling closes 2 hours before the appointment start
    if (cancelling && isCancellationClosed(existing)) {
      return res.status(403).json({ error: 'Appointments can no longer be cancelled within 2 hours of the scheduled time' })
    }

    const data = {}
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
    if (status !== undefined) data.status = status

    const slotDate = date ?? existing.date
    const slotTime = time ?? existing.time
    if ((date !== undefined || time !== undefined) && await hasSlotConflict(slotDate, slotTime, id)) {
      return res.status(400).json({
        error: 'This time slot is already taken.',
      })
    }

    if (Object.keys(data).length === 0) {
      return res.json(existing)
    }

    const updated = await db.appointment.update({ where: { id }, data })
    return res.json(updated)
  }

  // Staff branch (DENTIST / ASSISTANT)
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

  const slotDate = date ?? existing.date
  const slotTime = time ?? existing.time
  if ((date !== undefined || time !== undefined) && await hasSlotConflict(slotDate, slotTime, id)) {
    return res.status(400).json({
      error: 'This time slot is already taken.',
    })
  }

  if (Object.keys(data).length === 0) {
    return res.json(existing)
  }

  const updated = await db.appointment.update({
    where: { id },
    data,
  })

  // Notify the patient when a pending request is approved. Email failures
  // must not fail the approval itself.
  if (status === APPOINTMENT_STATUSES.SCHEDULED && existing.status !== APPOINTMENT_STATUSES.SCHEDULED) {
    db.patient
      .findUnique({ where: { id: updated.patientId } })
      .then((patient) => sendAppointmentScheduledEmail(patient, updated))
      .then((result) => {
        if (result?.messageId) console.log(`[mail] appointment scheduled email sent (${result.messageId})`)
        else if (result?.skipped) console.warn(`[mail] appointment scheduled email skipped: ${result.skipped}`)
      })
      .catch((err) => console.error('[mail] appointment scheduled email failed:', err.message))
  }

  return res.json(updated)
}))

// DELETE /api/appointments — bulk delete (history)
router.delete('/', authenticate, requireRole(ROLES.DENTIST, ROLES.ASSISTANT, ROLES.PATIENT), withErrors(async (req, res) => {
  let patientId

  if (req.user.role === ROLES.PATIENT) {
    if (!req.user.patientRef) return res.status(400).json({ error: 'Patient account is not linked to a patient record.' })
    patientId = req.user.patientRef
  } else {
    patientId = req.query.patientId
    if (!patientId) return res.status(400).json({ error: 'patientId query parameter is required.' })
  }

  const all = await db.appointment.findMany({
    where: {
      patientId,
      status: { in: [APPOINTMENT_STATUSES.COMPLETED, APPOINTMENT_STATUSES.CANCELLED, APPOINTMENT_STATUSES.NO_SHOW] },
    },
  })

  if (all.length === 0) return res.json({ deleted: 0 })

  await db.appointment.deleteMany({
    where: { id: { in: all.map(a => a.id) } },
  })

  return res.json({ deleted: all.length })
}))

// DELETE /api/appointments/:id
router.delete('/:id', authenticate, requireRole(ROLES.DENTIST, ROLES.ASSISTANT, ROLES.PATIENT), withErrors(async (req, res) => {
  const { id } = req.params

  const existing = await db.appointment.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Appointment not found' })

  if (req.user.role === ROLES.PATIENT) {
    if (existing.patientId !== req.user.patientRef) {
      return res.status(403).json({ error: 'You can only delete your own appointments.' })
    }
    if ([APPOINTMENT_STATUSES.PENDING, APPOINTMENT_STATUSES.SCHEDULED].includes(existing.status)) {
      return res.status(403).json({ error: 'Only past appointments can be deleted.' })
    }
  }

  await db.appointment.delete({ where: { id } })

  return res.json({ success: true })
}))

module.exports = router
module.exports.isCancellationClosed = isCancellationClosed
