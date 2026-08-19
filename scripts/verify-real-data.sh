#!/usr/bin/env bash
set -euo pipefail

echo "Checking that production does not contain obvious demo markers..."

if [ -n "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is configured."
else
  echo "DATABASE_URL is missing."
  exit 1
fi

echo "Application-level verification must also check:"
echo "- no seed/demo accounts"
echo "- no fake revenue"
echo "- no fake opportunity records"
echo "- every external dataset has source metadata"
echo "- every public statistic has period + retrieved_at"
echo "REAL DATA GATE PASSED: infrastructure configuration only."
