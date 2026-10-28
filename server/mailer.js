const nodemailer = require('nodemailer')

const CLINIC_NAME = 'Sonido Dental Clinic'
const CLINIC_TIME_ZONE = 'Asia/Manila'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

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
let cachedToken = { key: '', token: '', expiresAt: 0 }

/** Gmail SMTP transport (used off Render), or null when not configured. */
function getTransporter() {
  if (transporterLoaded) return cachedTransporter
  transporterLoaded = true

  const user = (process.env.GMAIL_USER || '').trim()
  // Google displays app passwords with spaces; SMTP expects them without.
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
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

/** Gmail API config from env, or null when incomplete. */
function getGmailApiConfig() {
  const clientId = (process.env.GMAIL_CLIENT_ID || '').trim()
  const clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim()
  const refreshToken = (process.env.GMAIL_REFRESH_TOKEN || '').trim()
  const user = (process.env.GMAIL_USER || '').trim()
  if (!clientId || !clientSecret || !refreshToken || !user) return null
  return { clientId, clientSecret, refreshToken, user }
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

function mailFrom(user) {
  return `"${CLINIC_NAME}" <${user || 'no-reply@sonidodentalclinic.local'}>`
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

async function getGmailAccessToken(config, fetchImpl = fetch) {
  if (cachedToken.key === config.refreshToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const res = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.access_token) {
    const detail = [body.error, body.error_description].filter(Boolean).join(' — ')
    throw new Error(`Gmail token request failed: ${res.status}${detail ? ` ${detail}` : ''}`)
  }

  cachedToken = {
    key: config.refreshToken,
    token: body.access_token,
    expiresAt: Date.now() + Math.max(0, (body.expires_in || 3600) - 60) * 1000,
  }
  return body.access_token
}

/**
 * Send over HTTPS so it works on Render Free, which blocks SMTP ports.
 * The raw MIME message is built by nodemailer's stream transport.
 */
async function sendViaGmailApi(mail, config = getGmailApiConfig(), fetchImpl = fetch) {
  if (!config) return { skipped: 'no-credentials' }

  const accessToken = await getGmailAccessToken(config, fetchImpl)
  const generator = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' })
  const { message } = await generator.sendMail({ from: mailFrom(config.user), ...mail })
  const raw = Buffer.from(message).toString('base64url')

  const res = await fetchImpl(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Gmail API send failed: ${res.status}${body.error?.message ? ` ${body.error.message}` : ''}`)
  }
  return { messageId: body.id }
}

/**
 * Email the patient that an approved request is now scheduled.
 * Prefers the Gmail API when configured; falls back to Gmail SMTP locally.
 * Returns { skipped } when there is no address or no mail transport.
 */
async function sendAppointmentScheduledEmail(patient, appointment, smtpTransport) {
  const mail = buildScheduledEmail(patient, appointment)
  if (!mail.to) return { skipped: 'no-email' }

  const gmailApi = getGmailApiConfig()
  if (gmailApi) return sendViaGmailApi(mail, gmailApi)

  const transporter = smtpTransport === undefined ? getTransporter() : smtpTransport
  if (!transporter) {
    console.warn('[mail] No Gmail API or SMTP credentials configured — appointment email skipped')
    return { skipped: 'no-credentials' }
  }

  const info = await transporter.sendMail({ from: mailFrom(process.env.GMAIL_USER), ...mail })
  return { messageId: info.messageId }
}

module.exports = {
  buildScheduledEmail,
  sendAppointmentScheduledEmail,
  formatAppointmentTime,
  getGmailApiConfig,
  sendViaGmailApi,
}
