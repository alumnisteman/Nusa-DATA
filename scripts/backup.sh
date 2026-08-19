#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/opt/backups/restart-ai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/restart_${TIMESTAMP}.dump"

echo "Creating backup directory if not exists..."
mkdir -p "${BACKUP_DIR}"

echo "Starting PostgreSQL backup..."
docker compose exec -T postgres pg_dump -U restart -d restart_ai -Fc > "${BACKUP_FILE}"

echo "Backup completed: ${BACKUP_FILE}"

echo "Cleaning old backups (keep 7 daily, 4 weekly, 3 monthly)..."
find "${BACKUP_DIR}" -name "restart_*.dump" -type f -mtime +7 -delete

echo "Backup process finished"
