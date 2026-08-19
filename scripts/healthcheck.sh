#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-https://api.restart.example.com}"

echo "Checking API health..."
HTTP_CODE=$(curl --silent --output /dev/null --write-out "%{http_code}" "${API_URL}/health")

if [ "$HTTP_CODE" != "200" ]; then
  echo "API health check failed: HTTP ${HTTP_CODE}"
  exit 1
fi

echo "API OK"
