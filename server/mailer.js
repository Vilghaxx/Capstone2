const nodemailer = require('nodemailer')

const CLINIC_NAME = 'Sonido Dental Clinic'
const CLINIC_TIME_ZONE = 'Asia/Manila'

const APPOINTMENT_TYPE_LABELS = {
  checkup: 'Checkup',
  cleaning: 'Cleaning',
  filling: 'Filling',
  extraction: 'Extraction',
  'root-canal': 'Root Canal',
  crown: 'Crown',
  'teeth-whitening': 'Teeth Whitening',
  'braces-adjustment': 'Braces & Adjustment',
  retainer: 'Retainer',
  other: 'Other',
}

let cachedTransporter
let transporterLoaded = false

/** Gmail SMTP transport, or null when credentials are not configured. */
function getTransporter() {
  if (transporterLoaded) return cachedTransporter
  transporterLoaded = true

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    cachedTransporter = null
    return null
  }

  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  })
  return cachedTransporter
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatAppointmentDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value ?? '')
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: CLINIC_TIME_ZONE,
  }).format(date)
}

/** "09:00" → "9:00 AM"; leaves unexpected values untouched. */
function formatAppointmentTime(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return String(value ?? '')
  const suffix = hours >= 12 ? 'PM' : 'AM'
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function buildScheduledEmail(patient, appointment) {
  const to = (patient?.email || '').trim()
  const name = (patient?.name || 'there').trim() || 'there'
  const type = APPOINTMENT_TYPE_LABELS[appointment.type] || appointment.type || 'Appointment'
  const date = formatAppointmentDate(appointment.date)
  const time = formatAppointmentTime(appointment.time)
  const subject = `Your appointment is scheduled — ${CLINIC_NAME}`

  const text = [
    `Hi ${name},`,
    '',
    'Good news — your appointment request has been approved and scheduled.',
    '',
    `Type: ${type}`,
    `Date: ${date}`,
    `Time: ${time}`,
    '',
    'If you need to change or cancel, please do so at least 2 hours before your appointment in My Appointments.',
    '',
    'See you soon,',
    CLINIC_NAME,
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <p>Hi ${escapeHtml(name)},</p>
      <p>Good news — your appointment request has been approved and scheduled.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 2px 12px 2px 0; color: #6b7280;">Type</td><td><strong>${escapeHtml(type)}</strong></td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #6b7280;">Date</td><td><strong>${escapeHtml(date)}</strong></td></tr>
        <tr><td style="padding: 2px 12px 2px 0; color: #6b7280;">Time</td><td><strong>${escapeHtml(time)}</strong></td></tr>
      </table>
      <p>If you need to change or cancel, please do so at least 2 hours before your appointment in My Appointments.</p>
      <p>See you soon,<br>${CLINIC_NAME}</p>
    </div>
  `.trim()

  return { to, subject, text, html }
}

/**
 * Email the patient that an approved request is now scheduled.
 * Returns { skipped } when there is no address or SMTP is not configured.
 */
async function sendAppointmentScheduledEmail(patient, appointment, transporter = getTransporter()) {
  const mail = buildScheduledEmail(patient, appointment)
  if (!mail.to) return { skipped: 'no-email' }

  if (!transporter) {
    console.warn('[mail] GMAIL_USER / GMAIL_APP_PASSWORD not set — appointment email skipped')
    return { skipped: 'no-credentials' }
  }

  const info = await transporter.sendMail({
    from: `"${CLINIC_NAME}" <${process.env.GMAIL_USER || 'no-reply@sonidodentalclinic.local'}>`,
    ...mail,
  })
  return { messageId: info.messageId }
}

module.exports = {
  buildScheduledEmail,
  sendAppointmentScheduledEmail,
  formatAppointmentTime,
}
