const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const patientRoutes = require('./routes/patients')
const appointmentRoutes = require('./routes/appointments')
const billingRoutes = require('./routes/billing')
const treatmentRoutes = require('./routes/treatments')
const teethRoutes = require('./routes/teeth')

const app = express()
const PORT = process.env.API_PORT || 3001

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

app.use((err, _req, res, _next) => {
  console.error('[SERVER ERROR]', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`[server] Express API running on http://localhost:${PORT}`)
})
