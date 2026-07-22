const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const JWT_SECRET =
  process.env.JWT_SECRET || 'radiograph-dev-secret-change-in-production'
const JWT_EXPIRES_IN = '7d'

function hashPassword(password) {
  return bcrypt.hashSync(password, 10)
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash)
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  JWT_SECRET,
}
