const { Router } = require('express')
const { db } = require('../db')
const { hashPassword, comparePassword, signToken, verifyToken } = require('../auth')
const { loginFormSchema, registerFormSchema, handleValidationError } = require('../validate')
const { ROLES, TOOTH_STATUSES, TOTAL_TEETH } = require('../constants')
const { authenticate, withErrors } = require('../middleware')

const router = Router()

// POST /api/auth/login
router.post('/login', withErrors(async (req, res) => {
  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = loginFormSchema.safeParse(body)
  if (!parsed.success) return handleValidationError(res, parsed.error)

  const { username, password } = parsed.data

  const user = await db.user.findUnique({ where: { username } })
  if (!user || !comparePassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    patientRef: user.patientRef ?? null,
  }

  const token = signToken(payload)

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      patientRef: user.patientRef ?? null,
    },
  })
}))

// POST /api/auth/register
router.post('/register', withErrors(async (req, res) => {
  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = registerFormSchema.safeParse(body)
  if (!parsed.success) return handleValidationError(res, parsed.error)

  const { name, username, password, phone, email, dateOfBirth, address } = parsed.data

  const existing = await db.user.findUnique({ where: { username } })
  if (existing) {
    return res.status(409).json({ error: 'Username is already taken' })
  }

  const result = await db.$transaction(async (tx) => {
    const raceExisting = await tx.user.findUnique({ where: { username } })
    if (raceExisting) {
      throw new Error('USERNAME_TAKEN')
    }

    const newUser = await tx.user.create({
      data: {
        username,
        password: hashPassword(password),
        role: ROLES.PATIENT,
        name,
      },
    })

    const newPatient = await tx.patient.create({
      data: {
        name,
        phone,
        email,
        dateOfBirth,
        address: address ?? '',
      },
    })

    await tx.user.update({
      where: { id: newUser.id },
      data: { patientRef: newPatient.id },
    })

    const teethData = Array.from({ length: TOTAL_TEETH }, (_, i) => ({
      patientId: newPatient.id,
      toothNumber: i + 1,
      status: TOOTH_STATUSES.HEALTHY,
      notes: null,
    }))
    await tx.tooth.createMany({ data: teethData })

    return { user: newUser, patient: newPatient }
  }).catch((err) => {
    if (err instanceof Error && err.message === 'USERNAME_TAKEN') {
      return null
    }
    throw err
  })

  if (!result) {
    return res.status(409).json({ error: 'Username is already taken' })
  }

  const { user, patient } = result

  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    patientRef: patient.id,
  }

  const token = signToken(payload)

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      patientRef: patient.id,
    },
  })
}))

// GET /api/auth/me
router.get('/me', authenticate, withErrors(async (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.user.sub } })
  if (!user) return res.status(401).json({ error: 'User no longer exists' })

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      patientRef: user.patientRef ?? null,
    },
  })
}))

module.exports = router
