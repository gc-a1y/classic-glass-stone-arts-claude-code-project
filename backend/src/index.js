import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bellaRouter from './routes/bella.js'
import paymentsRouter from './routes/payments.js'
import invoicesRouter from './routes/invoices.js'
import estimatesRouter from './routes/estimates.js'
import webhooksRouter from './routes/webhooks.js'
import { authenticateUser } from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT || 3001

// Webhooks need raw body — mount before json parser
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Public routes
app.use('/api/bella', bellaRouter)
app.use('/api/payments', paymentsRouter)

// Protected routes
app.use('/api/invoices', authenticateUser, invoicesRouter)
app.use('/api/estimates', authenticateUser, estimatesRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Classic Glass & Stone Arts backend running on port ${PORT}`)
})
