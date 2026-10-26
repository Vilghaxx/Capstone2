import { z } from 'zod'
import constants from './constants.js'

const { isToothNumber } = constants

const patientFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^(09|\+63)\d{9}$/, 'Enter a valid PH mobile number (e.g. 09171234567 or +639171234567)'),
  email: z.string().email('Invalid email address'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  address: z.string().optional().default(''),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional().default(''),
})

const appointmentFormSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required').refine(
    (t) => /^\d{2}:\d{2}$/.test(t) && Number(t.split(':')[0]) >= 9 && Number(t.split(':')[0]) < 17,
    'Appointments must be scheduled between 09:00 and 16:59'
  ),
  type: z.string().min(1, 'Type is required'),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional().default(''),
  status: z.string().optional().default('scheduled'),
  paymentMethod: z.enum(['pay', 'hmo']).optional().default('pay'),
  hmoCompany: z.string().max(200).optional().default(''),
  hmoInsuranceNo: z.string().max(100).optional().default(''),
  hmoAccountNo: z.string().max(100).optional().default(''),
  hmoBirthDate: z.string().optional().default(''),
}).refine(
  (d) => d.paymentMethod !== 'hmo' || (d.hmoCompany && d.hmoInsuranceNo && d.hmoAccountNo && d.hmoBirthDate),
  { message: 'All HMO fields are required', path: ['hmoCompany'] }
)

const appointmentUpdateSchema = z.object({
  status: z.string().min(1).optional(),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional(),
  time: z.string().min(1).optional().refine(
    (t) => !t || (/^\d{2}:\d{2}$/.test(t) && Number(t.split(':')[0]) >= 9 && Number(t.split(':')[0]) < 17),
    'Appointments must be scheduled between 09:00 and 16:59'
  ),
  type: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
})

const paymentFormSchema = z.object({
  paymentMethod: z.string().min(1, 'Payment method is required'),
  paidAmount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
})

const toothUpdateSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').nullable().optional(),
  treatmentPlan: z.string().max(2000, 'Treatment plan must be under 2000 characters').nullable().optional(),
  xrayData: z.string().max(4_000_000, 'X-ray image too large').nullable().optional(),
  xrayFilename: z.string().max(255).nullable().optional(),
  removeXray: z.boolean().optional(),
})

const patientXraySchema = z.object({
  xrayData: z
    .string()
    .max(4_200_000, 'X-ray image too large')
    .refine((s) => s.startsWith('data:image/'), 'Invalid image data')
    .optional(),
  removeXrayIndex: z.number().int().min(0).optional(),
  removeXray: z.boolean().optional(),
})

const treatmentFormSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  toothNumber: z.coerce.number().int().refine(isToothNumber, 'Invalid tooth number'),
  procedure: z.string().min(2, 'Procedure is required'),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional().default(''),
  cost: z.coerce.number().min(0, 'Cost must be a positive number'),
  followUpDate: z.string().nullable().optional(),
})

const googleCredentialSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
})

const treatmentUpdateSchema = z.object({
  procedure: z.string().min(2).optional(),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional(),
  cost: z.coerce.number().min(0).optional(),
  followUpDate: z.string().nullable().optional(),
})

const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^(09|\+63)\d{9}$/, 'Enter a valid PH mobile number (e.g. 09171234567 or +639171234567)'),
  email: z.string().email('Invalid email address'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  address: z.string().optional().default(''),
  allergies: z.string().max(100, 'Allergies must be under 100 characters').optional().default(''),
  specialCondition: z.string().max(100, 'Special condition must be under 100 characters').optional().default(''),
})

const patientAppointmentUpdateSchema = z.object({
  date: z.string().min(1).optional(),
  time: z.string().min(1).optional().refine(
    (t) => !t || (/^\d{2}:\d{2}$/.test(t) && Number(t.split(':')[0]) >= 9 && Number(t.split(':')[0]) < 17),
    'Appointments must be scheduled between 09:00 and 16:59'
  ),
  type: z.string().min(1).optional(),
  notes: z.string().max(1000, 'Notes must be under 1000 characters').optional(),
  status: z.literal('cancelled').optional(),
})

function handleValidationError(res, error) {
  return res.status(400).json({
    error: 'Validation failed',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.') || '_',
      message: issue.message,
    })),
  })
}

export default {
  googleCredentialSchema,
  patientFormSchema,
  profileUpdateSchema,
  appointmentFormSchema,
  appointmentUpdateSchema,
  paymentFormSchema,
  toothUpdateSchema,
  patientXraySchema,
  treatmentFormSchema,
  treatmentUpdateSchema,
  patientAppointmentUpdateSchema,
  handleValidationError,
}
