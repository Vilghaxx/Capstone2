const { verifyToken } = require('./auth')

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Authentication required' })
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const payload = verifyToken(parts[1])
  if (!payload) return res.status(401).json({ error: 'Authentication required' })
  req.user = payload
  next()
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

function withErrors(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (err) {
      console.error('[API ERROR]', err)
      const message = err instanceof Error ? err.message : 'Internal server error'
      res.status(500).json({ error: message })
    }
  }
}

module.exports = { authenticate, requireRole, withErrors }
