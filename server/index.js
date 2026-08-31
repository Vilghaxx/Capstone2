require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason)
})

const authRoutes = require('./routes/auth')
const patientRoutes = require('./routes/patients')
const appointmentRoutes = require('./routes/appointments')
const billingRoutes = require('./routes/billing')
const treatmentRoutes = require('./routes/treatments')
const teethRoutes = require('./routes/teeth')

const app = express()
const PORT = process.env.PORT || 3001

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone')
const staticDir = path.join(standaloneDir, '.next', 'static')
const publicDir = path.join(standaloneDir, 'public')
const indexPath = path.join(standaloneDir, '.next', 'server', 'app', 'index.html')

app.use(cors())
app.use(express.json())

app.get('/api', (_req, res) => {
  res.json({ message: 'Hello, world!' })
})

app.use('/api/auth', authRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/treatments', treatmentRoutes)
app.use('/api/teeth', teethRoutes)

if (fs.existsSync(staticDir)) {
  app.use('/_next/static', express.static(staticDir, { maxAge: '1y', immutable: true }))
}
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, { maxAge: '1h' }))
}

app.get('*', (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).send('Not found')
  }
})

app.use((err, _req, res, _next) => {
  console.error('[SERVER ERROR]', err)
  res.status(500).json({ error: 'Internal server error' })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Dental System running on http://0.0.0.0:${PORT}`)
})
server.timeout = 60_000
server.keepAliveTimeout = 60_000
