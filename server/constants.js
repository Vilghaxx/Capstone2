const ROLES = {
  DENTIST: 'dentist',
  CASHIER: 'cashier',
  PATIENT: 'patient',
}

const TOOTH_STATUSES = {
  HEALTHY: 'healthy',
  TREATED: 'treated',
  NEEDS_ATTENTION: 'needs-attention',
  URGENT: 'urgent',
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

const TOTAL_TEETH = 32

module.exports = {
  ROLES,
  TOOTH_STATUSES,
  APPOINTMENT_STATUSES,
  PAGINATION_DEFAULTS,
  TOTAL_TEETH,
}
