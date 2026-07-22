const { z } = require('zod')

const loginFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

const registerFormSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username is too long'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().optional(),
    phone: z.string().min(7, 'Phone number is too short'),
    email: z.string().email('Invalid email address'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    address: z.string().optional().default(''),
  })
  .refine(
    (data) =>
      data.confirmPassword === undefined ||
      data.password === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  )

const patientFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(7, 'Phone number is too short'),
  email: z.string().email('Invalid email address'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  address: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

const appointmentFormSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  type: z.string().min(1, 'Type is required'),
  notes: z.string().optional().default(''),
  status: z.string().optional().default('scheduled'),
})

const appointmentUpdateSchema = z.object({
  status: z.string().min(1).optional(),
  notes: z.string().optional(),
  time: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
})

const paymentFormSchema = z.object({
  paymentMethod: z.string().min(1, 'Payment method is required'),
  paidAmount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
})

const toothUpdateSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  notes: z.string().nullable().optional(),
})

const treatmentFormSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  toothNumber: z.coerce.number().int().min(1).max(32),
  procedure: z.string().min(2, 'Procedure is required'),
  notes: z.string().optional().default(''),
  cost: z.coerce.number().min(0, 'Cost must be a positive number'),
  followUpDate: z.string().nullable().optional(),
})

const treatmentUpdateSchema = z.object({
  procedure: z.string().min(2).optional(),
  notes: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  followUpDate: z.string().nullable().optional(),
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

module.exports = {
  loginFormSchema,
  registerFormSchema,
  patientFormSchema,
  appointmentFormSchema,
  appointmentUpdateSchema,
  paymentFormSchema,
  toothUpdateSchema,
  treatmentFormSchema,
  treatmentUpdateSchema,
  handleValidationError,
}
