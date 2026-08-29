#!/usr/bin/env bash
# download_kbli.sh
# This script fetches the official KBLI 2025 dataset from the OSS portal and SPSE data.
# Adjust URLs if the endpoints change.

set -e

# Directory to store downloaded data
DATA_DIR="$(dirname "$0")/../data"
mkdir -p "$DATA_DIR"

# --- KBLI dataset (OSS) ---
# Example API endpoint for KBLI 2025 (replace with the actual endpoint if different)
KBLI_URL="https://perizinan.oss.go.id/api/v1/kbli?year=2025"
KBLI_FILE="$DATA_DIR/kbli_2025.json"

echo "Downloading KBLI 2025 dataset..."
curl -L -o "$KBLI_FILE" "$KBLI_URL"

echo "KBLI data saved to $KBLI_FILE"

# --- SPSE data ---
# Example API endpoint for SPSE procurement data (replace as needed)
SPSE_URL="https://spse.inaproc.id/api/v1/data"
SPSE_FILE="$DATA_DIR/spse_data.json"

echo "Downloading SPSE data..."
curl -L -o "$SPSE_FILE" "$SPSE_URL"

echo "SPSE data saved to $SPSE_FILE"

# Optional: Convert JSON to CSV for import (placeholder)
# You can implement conversion logic here if needed.

echo "Download complete."
