# Procfile for Render - runs both Express API and Next.js
# Render only exposes one port per service, so you have two options:

# Option 1: Two separate Render services (recommended)
# Service 1 (API): web: node server/index.js
# Service 2 (Web): web: node .next/standalone/server.js

# Option 2: Single service with process manager (requires plan with multiple processes)
# web: npx concurrently "node server/index.js" "node .next/standalone/server.js"

# For Option 1, set these env vars on the Web service:
# NEXT_PUBLIC_API_URL=https://your-api-service.onrender.com

# For Option 2, both run on same service but Render only routes to one port