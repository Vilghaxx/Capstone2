#!/bin/bash
# Start both Express API (internal port 3001) and Next.js (Render's PORT)

# Copy static assets if not already present
if [ ! -d ".next/standalone/.next/static" ]; then
  echo "[start] Copying static assets..."
  cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
  cp -r public .next/standalone/public 2>/dev/null || true
fi

# Start Express API on internal port 3001
echo "[start] Starting Express API on port 3001..."
PORT=3001 node server/index.js &
API_PID=$!

# Wait for API to be ready
sleep 2

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
trap cleanup SIGTERM SIGINT

# Wait for either process to exit
wait $API_PID $WEB_PID
