#!/bin/bash
# Restore Gonok backups — PostgreSQL + CouchDB
# Usage:
#   bash scripts/restore.sh                          # restore latest daily backup
#   bash scripts/restore.sh 2026-04-25_0300          # restore specific date
#   bash scripts/restore.sh 2026-04-25_0300 pg       # restore PostgreSQL only
#   bash scripts/restore.sh 2026-04-25_0300 couch    # restore CouchDB only

set -euo pipefail

BACKUP_DIR="/backups/gonok"
DATE="${1:-}"
COMPONENT="${2:-all}"  # all, pg, couch

PG_CONTAINER="${PG_CONTAINER:-gonok-postgres-1}"
PG_USER="${POSTGRES_USER:-gonok}"
PG_DB="${POSTGRES_DB:-gonok}"

COUCH_CONTAINER="${COUCH_CONTAINER:-gonok-couchdb-1}"
COUCH_USER="${COUCHDB_USERNAME:-admin}"
COUCH_PASS="${COUCHDB_PASSWORD:-password}"
COUCH_URL="http://${COUCH_USER}:${COUCH_PASS}@localhost:5984"

# If no date specified, find the latest
if [ -z "${DATE}" ]; then
  LATEST_PG=$(ls -t "${BACKUP_DIR}/daily/postgres_"*.sql.gz 2>/dev/null | head -1 || true)
  if [ -z "${LATEST_PG}" ]; then
    echo "ERROR: No backups found in ${BACKUP_DIR}/daily/"
    exit 1
  fi
  DATE=$(echo "${LATEST_PG}" | sed 's/.*postgres_\(.*\)\.sql\.gz/\1/')
  echo "No date specified — using latest: ${DATE}"
fi

echo ""
echo "=== Gonok Restore — ${DATE} ==="
echo "WARNING: This will OVERWRITE current data!"
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# ─── PostgreSQL Restore ─────────────────────────────────
if [ "${COMPONENT}" = "all" ] || [ "${COMPONENT}" = "pg" ]; then
  PG_FILE="${BACKUP_DIR}/daily/postgres_${DATE}.sql.gz"
  if [ ! -f "${PG_FILE}" ]; then
    echo "ERROR: PostgreSQL backup not found: ${PG_FILE}"
    exit 1
  fi
  echo ""
  echo "[1] Restoring PostgreSQL from ${PG_FILE}..."
  gunzip -c "${PG_FILE}" | docker exec -i "${PG_CONTAINER}" psql -U "${PG_USER}" -d "${PG_DB}" --quiet
  echo "    PostgreSQL restored."
fi

# ─── CouchDB Restore ────────────────────────────────────
if [ "${COMPONENT}" = "all" ] || [ "${COMPONENT}" = "couch" ]; then
  COUCH_FILE="${BACKUP_DIR}/daily/couchdb_${DATE}.tar.gz"
  if [ ! -f "${COUCH_FILE}" ]; then
    echo "ERROR: CouchDB backup not found: ${COUCH_FILE}"
    exit 1
  fi
  echo ""
  echo "[2] Restoring CouchDB from ${COUCH_FILE}..."

  TEMP_DIR=$(mktemp -d)
  tar -xzf "${COUCH_FILE}" -C "${TEMP_DIR}"
  COUCH_DATA_DIR="${TEMP_DIR}/couchdb_${DATE}"

  for db_file in "${COUCH_DATA_DIR}"/*.json.gz; do
    db_name=$(basename "${db_file}" .json.gz)
    echo "    Restoring database: ${db_name}"

    # Create database if it doesn't exist
    docker exec "${COUCH_CONTAINER}" curl -sf -X PUT "${COUCH_URL}/${db_name}" > /dev/null 2>&1 || true

    # Bulk insert documents
    gunzip -c "${db_file}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
docs = []
for row in data.get('rows', []):
    doc = row.get('doc', {})
    doc.pop('_rev', None)
    if not doc.get('_id', '').startswith('_design/'):
        docs.append(doc)
if docs:
    print(json.dumps({'docs': docs}))
" | docker exec -i "${COUCH_CONTAINER}" curl -sf -X POST "${COUCH_URL}/${db_name}/_bulk_docs" -H "Content-Type: application/json" -d @- > /dev/null

  done

  rm -rf "${TEMP_DIR}"
  echo "    CouchDB restored."
fi

echo ""
echo "=== Restore complete! ==="
