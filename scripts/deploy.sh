#!/usr/bin/env bash
set -euo pipefail

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "========================================="
echo "🚀 Starting RESTART AI Deployment Pipeline"
echo "========================================="

# 1. Git Pull
echo "📥 Step 1: Pulling latest changes from Git..."
git pull origin main

# 2. Validate ENV
echo "🔍 Step 2: Validating environment configurations..."
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production not found!"
    exit 1
fi

# Load variables to validate
set -a
source .env.production
set +a

REQUIRED_VARS=(
    "DATABASE_URL"
    "REDIS_URL"
    "RABBITMQ_URL"
    "JWT_SECRET"
    "SESSION_SECRET"
    "AI_API_KEY"
)

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR:-}" ]; then
        echo "❌ Error: Required environment variable '$VAR' is missing or empty in .env.production"
        exit 1
    fi
done
echo "✅ Environment validation passed."

# 3. Build Docker
echo "🏗️ Step 3: Building Docker images..."
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

# 4. Start Infrastructure
echo "🔌 Step 4: Starting infrastructure services (PostgreSQL, Redis, RabbitMQ, Meilisearch)..."
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d postgres redis rabbitmq meilisearch

echo "⏳ Waiting for infrastructure to become healthy..."
sleep 10

# 5. Database Migration
echo "🗄️ Step 5: Running Prisma database migrations..."
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml run --rm api npx prisma migrate deploy

# 6. Start Application
echo "🚀 Step 6: Starting all application containers & workers..."
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d

# 7. Health Check
echo "🩺 Step 7: Performing health checks..."
sleep 5

MAX_ATTEMPTS=6
ATTEMPT=1
HEALTHY=false

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "Checking API health (attempt $ATTEMPT/$MAX_ATTEMPTS)..."
    if curl -s -f http://localhost:3001/health >/dev/null 2>&1 || curl -s -f http://localhost:3002/api/health >/dev/null 2>&1; then
        echo "✅ API is up and healthy."
        HEALTHY=true
        break
    fi
    echo "API is not ready yet. Waiting 5s..."
    sleep 5
    ATTEMPT=$((ATTEMPT + 1))
done

if [ "$HEALTHY" = false ]; then
    echo "❌ Error: API health check failed after $MAX_ATTEMPTS attempts."
    exit 1
fi

# 8. Production Ready
echo "🧹 Cleaning up unused Docker resources..."
docker image prune -f

echo "========================================="
echo "🎉 RESTART AI is Production Ready!"
echo "========================================="
