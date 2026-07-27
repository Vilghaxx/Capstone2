const { Router } = require('express')
const { db } = require('../db')
const { signToken } = require('../auth')
const { googleCredentialSchema, profileUpdateSchema, handleValidationError } = require('../validate')
const { ROLES, TOOTH_STATUSES, TOTAL_TEETH } = require('../constants')
const { authenticate, withErrors } = require('../middleware')
const { OAuth2Client } = require('google-auth-library')

const router = Router()

// POST /api/auth/google
router.post('/google', withErrors(async (req, res) => {
  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = googleCredentialSchema.safeParse(body)
  if (!parsed.success) return handleValidationError(res, parsed.error)

  let googlePayload
  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({
      idToken: parsed.data.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    googlePayload = ticket.getPayload()
  } catch {
    return res.status(401).json({ error: 'Invalid Google credential' })
  }

  if (!googlePayload.email_verified) {
    return res.status(401).json({ error: 'Google email not verified' })
  }

  const { email, name, sub: googleId } = googlePayload

  // Returning Google user → log in directly
  const existingByGoogleId = await db.user.findUnique({ where: { googleId } })
  if (existingByGoogleId) {
    return res.json({
      token: signToken({
        sub: existingByGoogleId.id,
        username: existingByGoogleId.username,
        role: existingByGoogleId.role,
        name: existingByGoogleId.name,
        patientRef: existingByGoogleId.patientRef ?? null,
      }),
      user: {
        id: existingByGoogleId.id,
        username: existingByGoogleId.username,
        role: existingByGoogleId.role,
        name: existingByGoogleId.name,
        patientRef: existingByGoogleId.patientRef ?? null,
      },
    })
  }

  // Lookup: patient(email) → user(patientRef) for linking
  const existingPatient = await db.patient.findUnique({ where: { email } })
  if (existingPatient) {
    const linkedUser = await db.user.findUnique({ where: { patientRef: existingPatient.id } })
    if (linkedUser) {
      const user = await db.user.update({
        where: { id: linkedUser.id },
        data: { googleId, email: linkedUser.email || email },
      })
      return res.json({
        token: signToken({
          sub: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          patientRef: user.patientRef ?? null,
        }),
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          patientRef: user.patientRef ?? null,
        },
      })
    }
  }

  // Determine role by registration order
  const userCount = await db.user.count()
  let role
  if (userCount === 0) {
    role = ROLES.DENTIST
  } else if (userCount === 1) {
    role = ROLES.CASHIER
  } else {
    role = ROLES.PATIENT
  }

  const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_')
  let username = baseUsername
  let suffix = 0
  while (await db.user.findUnique({ where: { username } })) {
    suffix++
    username = `${baseUsername}${suffix}`
  }

  if (role === ROLES.DENTIST || role === ROLES.CASHIER) {
    const newUser = await db.user.create({
      data: { username, role, name, email, googleId },
    })
    return res.status(201).json({
      token: signToken({
        sub: newUser.id,
        username: newUser.username,
        role: newUser.role,
        name: newUser.name,
        patientRef: null,
      }),
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        name: newUser.name,
        patientRef: null,
      },
    })
  }

  // Patient: create user + patient record + teeth
  const result = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { username, role: ROLES.PATIENT, name, email, googleId },
    })

    const newPatient = await tx.patient.create({
      data: { name, email, phone: '', dateOfBirth: '', address: '' },
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
  })

  return res.status(201).json({
    token: signToken({
      sub: result.user.id,
      username: result.user.username,
      role: result.user.role,
      name: result.user.name,
      patientRef: result.patient.id,
    }),
    user: {
      id: result.user.id,
      username: result.user.username,
      role: result.user.role,
      name: result.user.name,
      patientRef: result.patient.id,
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

// GET /api/auth/profile — patient's own profile
router.get('/profile', authenticate, withErrors(async (req, res) => {
  if (req.user.role !== ROLES.PATIENT) {
    return res.status(403).json({ error: 'Only patient accounts can access this endpoint' })
  }

  const patient = await db.patient.findUnique({ where: { id: req.user.patientRef } })
  if (!patient) return res.status(404).json({ error: 'Patient profile not found' })

  return res.json({ patient })
}))

// PUT /api/auth/profile — patient updates own profile
router.put('/profile', authenticate, withErrors(async (req, res) => {
  if (req.user.role !== ROLES.PATIENT) {
    return res.status(403).json({ error: 'Only patient accounts can access this endpoint' })
  }

  const body = req.body
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) return handleValidationError(res, parsed.error)

  const existing = await db.patient.findUnique({ where: { id: req.user.patientRef } })
  if (!existing) return res.status(404).json({ error: 'Patient profile not found' })

  const updated = await db.patient.update({
    where: { id: req.user.patientRef },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      dateOfBirth: parsed.data.dateOfBirth,
      address: parsed.data.address ?? '',
    },
  })

  // Sync name on user record so sidebar reflects change
  if (parsed.data.name !== req.user.name) {
    await db.user.update({
      where: { id: req.user.sub },
      data: { name: parsed.data.name },
    })
  }

  return res.json(updated)
}))

module.exports = router
