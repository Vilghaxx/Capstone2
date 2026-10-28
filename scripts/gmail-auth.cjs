#!/usr/bin/env node
/**
 * One-time Gmail API setup. Prints the refresh token for the clinic Gmail.
 *
 * Usage:
 *   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/gmail-auth.cjs
 *
 * Create a "Desktop app" OAuth client in Google Cloud, enable the Gmail API,
 * and add https://www.googleapis.com/auth/gmail.send to the OAuth consent
 * screen first. Only needs to be run again if the token is revoked.
 */
const http = require('node:http')
const crypto = require('node:crypto')
const { execFile } = require('node:child_process')

require('dotenv').config()

const clientId = (process.env.GMAIL_CLIENT_ID || '').trim()
const clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim()
const loginHint = (process.env.GMAIL_USER || '').trim()

if (!clientId || !clientSecret) {
  console.error('Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET.')
  console.error('Get them from Google Cloud Console → APIs & Services → Credentials → OAuth client (Desktop app).')
  process.exit(1)
}

const PORT = 53682
const redirectUri = `http://localhost:${PORT}`
const scope = 'https://www.googleapis.com/auth/gmail.send'
const state = crypto.randomBytes(16).toString('hex')

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id', clientId)
authUrl.searchParams.set('redirect_uri', redirectUri)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', scope)
authUrl.searchParams.set('access_type', 'offline')
authUrl.searchParams.set('prompt', 'consent')
authUrl.searchParams.set('state', state)
if (loginHint) authUrl.searchParams.set('login_hint', loginHint)

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri)

  if (url.searchParams.get('state') !== state) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('State mismatch — run the script again.')
    return
  }

  const error = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  if (error || !code) {
    res.writeHead(400, { 'Content-Type': 'text/html' }).end(`<h1>Authorization failed</h1><p>${error || 'Missing code'}</p>`)
    console.error('\nAuthorization failed:', error || 'missing code')
    server.close()
    process.exitCode = 1
    return
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const token = await tokenRes.json()
    if (!tokenRes.ok || !token.refresh_token) {
      throw new Error([tokenRes.status, token.error, token.error_description].filter(Boolean).join(' '))
    }

    console.log('\nAuthorized. Add these to .env and Render, then redeploy:\n')
    console.log(`GMAIL_CLIENT_ID=${clientId}`)
    console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`)
    console.log(`GMAIL_REFRESH_TOKEN=${token.refresh_token}`)
    console.log(`GMAIL_USER=${loginHint || '<the Gmail account you just authorized>'}`)

    res.writeHead(200, { 'Content-Type': 'text/html' }).end(
      '<h1>Done</h1><p>Refresh token printed in your terminal. You can close this tab.</p>'
    )
    server.close()
  } catch (err) {
    console.error('\nToken exchange failed:', err.message)
    res.writeHead(500, { 'Content-Type': 'text/html' }).end(`<h1>Token exchange failed</h1><p>${err.message}</p>`)
    server.close()
    process.exitCode = 1
  }
})

server.listen(PORT, () => {
  console.log('Open this URL in your browser and sign in with the clinic Gmail:\n')
  console.log(authUrl.toString())
  console.log(`\nWaiting for the Google callback on ${redirectUri} ...`)
  execFile('xdg-open', [authUrl.toString()], (err) => {
    if (err) console.log('(Could not open a browser automatically — open the URL above manually.)')
  })
})
