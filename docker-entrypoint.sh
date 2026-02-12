#!/bin/sh
set -e

echo "🗄️  Running database migrations..."
cd /app/backend && node dist/db/migrate.js || echo "⚠️ Migration skipped (DB might not be ready)"

echo "🚀 Starting API server..."
cd /app/backend && node dist/server.js &

echo "🌐 Serving frontend..."
serve -s /app/frontend/dist -l 3000 &

wait
