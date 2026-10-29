const ROLES = {
  DENTIST: 'dentist',
  ASSISTANT: 'assistant',
  PATIENT: 'patient',
}

const TOOTH_STATUSES = {
  HEALTHY: 'healthy',
  TREATED: 'treated',
  NEEDS_ATTENTION: 'needs-attention',
  MISSING: 'missing',
  EXTRACTED: 'extracted',
}

const APPOINTMENT_STATUSES = {
  PENDING: 'pending',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show',
}

const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 200,
}

const PERMANENT_TEETH = [1, 2, 3, 4].flatMap((quadrant) =>
  Array.from({ length: 8 }, (_, i) => quadrant * 10 + i + 1)
)

const PRIMARY_TEETH = [5, 6, 7, 8].flatMap((quadrant) =>
  Array.from({ length: 5 }, (_, i) => quadrant * 10 + i + 1)
)

const ALL_TOOTH_NUMBERS = [...PERMANENT_TEETH, ...PRIMARY_TEETH]

function isToothNumber(toothNumber) {
  return ALL_TOOTH_NUMBERS.includes(toothNumber)
}

module.exports = {
  ROLES,
  TOOTH_STATUSES,
  APPOINTMENT_STATUSES,
  PAGINATION_DEFAULTS,
  PERMANENT_TEETH,
  PRIMARY_TEETH,
  ALL_TOOTH_NUMBERS,
  isToothNumber,
}
