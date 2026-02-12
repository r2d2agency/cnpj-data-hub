#!/bin/sh
set -e

echo "🗄️  Running database migrations..."
cd /app/backend && node dist/db/migrate.js || echo "⚠️ Migration skipped (DB might not be ready)"

echo "🚀 Starting server..."
cd /app/backend && node dist/server.js
