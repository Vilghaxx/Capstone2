#!/bin/bash
# Start both Express API (internal port 3001) and Next.js (Render's PORT)
set -e

# Copy static assets if not already present
if [ ! -d ".next/standalone/.next/static" ]; then
  echo "[start] Copying static assets..."
  cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
  cp -r public .next/standalone/public 2>/dev/null || true
fi

# Start Express API on internal port 4000
echo "[start] Starting Express API on port 4000..."
PORT=4000 node server/index.js &
API_PID=$!

# Wait for API to be ready
sleep 3

# Start Next.js on Render's PORT (or 3000 for local)
echo "[start] Starting Next.js on port ${PORT:-3000}..."
node .next/standalone/server.js &
WEB_PID=$!

# Handle shutdown
cleanup() {
  echo "[start] Shutting down..."
  kill $API_PID $WEB_PID 2>/dev/null
  wait $API_PID $WEB_PID 2>/dev/null
  exit 0
}
trap cleanup SIGTERM SIGINT SIGHUP

# Keep the script alive and forward signals
wait $API_PID $WEB_PID
