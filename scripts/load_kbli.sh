#!/usr/bin/env bash
# load_kbli.sh
# Script to import the KBLI 2025 dataset (downloaded as JSON) into the PostGIS database.
# Requires: jq, docker-compose, and the Docker service "restart-postgres" defined in docker-compose.yml.

set -e

# Directory containing the downloaded JSON files
DATA_DIR="$(dirname "$0")/../data"
KBLI_JSON="$DATA_DIR/kbli_2025.json"
KBLI_CSV="$DATA_DIR/kbli_2025.csv"

# Check if the JSON file exists
if [[ ! -f "$KBLI_JSON" ]]; then
  echo "File $KBLI_JSON tidak ditemukan. Jalankan scripts/download_kbli.sh dulu."
  exit 1
fi

# Convert JSON to CSV (code, title, description, source_url, geom_wkt)
# Clean the JSON: remove duplicate entries by KBLI code and ensure each entry has a code
CLEANED_JSON="$DATA_DIR/kbli_2025_cleaned.json"
echo "Membersihkan data KBLI..."
jq 'map(select(.code != null)) | unique_by(.code)' "$KBLI_JSON" > "$CLEANED_JSON"
KBLI_JSON="$CLEANED_JSON"

echo "Mengonversi $KBLI_JSON ke CSV..."
jq -r '.[] | [
  .code,
  .title,
  (.description // ""),
  (.source_url // ""),
  (if (.latitude != null and .longitude != null) then "POINT(\(.longitude) \(.latitude))" else "" end)
] | @csv' "$KBLI_JSON" > "$KBLI_CSV"

echo "CSV disimpan di $KBLI_CSV"

# Load CSV ke dalam tabel kbli menggunakan psql dalam container PostGIS
# Pastikan layanan postgres (restart-postgres) sedang berjalan.

POSTGRES_USER="${POSTGRES_USER:-restart}"
POSTGRES_DB="${POSTGRES_DB:-restart_ai}"

echo "Mengimpor data ke database..."
cat "$KBLI_CSV" | docker compose exec -T restart-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\copy kbli(code, title, description, source_url, geom) FROM STDIN CSV QUOTE '"' ESCAPE '\\'""

echo "Impor selesai."
