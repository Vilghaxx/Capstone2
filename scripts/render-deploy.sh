#!/bin/bash
# render-deploy.sh - Helper script for dental system Render deployment

set -e

echo "=== Dental System Render Deployment Helper ==="
echo ""

echo "This project requires TWO Render services:"
echo "  1. API Service (Express) - runs on port 3001"
echo "  2. Web Service (Next.js) - runs on Render's PORT"
echo ""

# Prompt for service names
if [ -z "$RENDER_API_SERVICE" ]; then
    read -p "Enter your Render API service name: " API_SERVICE
else
    API_SERVICE=$RENDER_API_SERVICE
    echo "Using API service name: $API_SERVICE"
fi

if [ -z "$RENDER_WEB_SERVICE" ]; then
    read -p "Enter your Render Web service name: " WEB_SERVICE
else
    WEB_SERVICE=$RENDER_WEB_SERVICE
    echo "Using Web service name: $WEB_SERVICE"
fi

echo ""
echo "=== API Service Setup ==="
echo "Build Command: bun install && bun run build"
echo "Start Command: node server/index.js"
echo "Environment Variables:"
echo "  FIREBASE_KEY_PATH=sonidodentalsystem-firebase-adminsdk-fbsvc-5784825144.json"
echo "  FIREBASE_DATABASE_URL=https://sonidodentalsystem-default-rtdb.asia-southeast1.firebasedatabase.app"
echo "  JWT_SECRET=your-secure-random-secret-change-from-dev"
echo "  GOOGLE_CLIENT_ID=933171086472-ajmje2ohi7tieracdqa3l6muk9mpkblf.apps.googleusercontent.com"
echo "  NODE_OPTIONS=--max-old-space-size=4096 (optional)"
echo ""

echo "=== Web Service Setup ==="
echo "Build Command: bun install && bun run build"
echo "Start Command: node .next/standalone/server.js"
echo "Environment Variables:"
echo "  NEXT_PUBLIC_API_URL=https://$API_SERVICE.onrender.com"
echo ""

echo "=== Deployment Steps ==="
echo "1. Create API service in Render dashboard (Node.js)"
echo "2. Create Web service in Render dashboard (Node.js)"
echo "3. Set environment variables on each service"
echo "4. Deploy both services"
echo ""

if [ -n "$RENDER_API_KEY" ]; then
    echo "5. Triggering API deploy..."
    curl -X POST \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"source": "github"}' \
        "https://api.render.com/v1/services/$API_SERVICE/deploys" 2>/dev/null || true
    
    echo "Triggering Web deploy..."
    curl -X POST \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"source": "github"}' \
        "https://api.render.com/v1/services/$WEB_SERVICE/deploys" 2>/dev/null || true
    echo "Deploys triggered via API"
else
    echo "Set RENDER_API_KEY to auto-trigger deploys"
    echo "Or manually trigger in Render dashboard > Deploys > New manual deploy"
fi

echo ""
echo "=== Post-Deploy Verification ==="
echo "- Visit https://$WEB_SERVICE.onrender.com"
echo "- Test Google OAuth sign-in"
echo "- Test patient chart, appointments, billing"
echo "- Check API at https://$API_SERVICE.onrender.com/api"