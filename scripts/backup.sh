#!/bin/bash
# Automated backup for Gonok — PostgreSQL + CouchDB
# Run daily via cron: 0 3 * * * /home/ubuntu/Gonok-Accounting/scripts/backup.sh
#
# Keeps: 7 daily + 4 weekly backups (auto-rotated)

set -euo pipefail

# ─── Config ──────────────────────────────────────────────
BACKUP_DIR="/backups/gonok"
DAILY_KEEP=7
WEEKLY_KEEP=4
DATE=$(date +%Y-%m-%d_%H%M)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday

PG_CONTAINER="${PG_CONTAINER:-gonok-postgres-1}"
PG_USER="${POSTGRES_USER:-gonok}"
PG_DB="${POSTGRES_DB:-gonok}"

COUCH_CONTAINER="${COUCH_CONTAINER:-gonok-couchdb-1}"
COUCH_USER="${COUCHDB_USERNAME:-admin}"
COUCH_PASS="${COUCHDB_PASSWORD:-password}"
COUCH_URL="http://${COUCH_USER}:${COUCH_PASS}@localhost:5984"

# ─── Setup ───────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}/daily" "${BACKUP_DIR}/weekly"

echo "=== Gonok Backup — ${DATE} ==="

# ─── 1. PostgreSQL Backup ────────────────────────────────
echo "[1/3] Backing up PostgreSQL..."
PG_FILE="${BACKUP_DIR}/daily/postgres_${DATE}.sql.gz"
docker exec "${PG_CONTAINER}" pg_dump -U "${PG_USER}" "${PG_DB}" | gzip > "${PG_FILE}"
PG_SIZE=$(du -h "${PG_FILE}" | cut -f1)
echo "      PostgreSQL: ${PG_FILE} (${PG_SIZE})"

# ─── 2. CouchDB Backup ──────────────────────────────────
echo "[2/3] Backing up CouchDB..."
COUCH_DIR="${BACKUP_DIR}/daily/couchdb_${DATE}"
mkdir -p "${COUCH_DIR}"

# Get all database names (skip system dbs)
DBS=$(docker exec "${COUCH_CONTAINER}" curl -sf "${COUCH_URL}/_all_dbs" | tr -d '[]"' | tr ',' '\n' | grep -v '^_')

DB_COUNT=0
for db in $DBS; do
  docker exec "${COUCH_CONTAINER}" curl -sf "${COUCH_URL}/${db}/_all_docs?include_docs=true" | gzip > "${COUCH_DIR}/${db}.json.gz"
  DB_COUNT=$((DB_COUNT + 1))
done

# Compress CouchDB backup directory
COUCH_FILE="${COUCH_DIR}.tar.gz"
tar -czf "${COUCH_FILE}" -C "${BACKUP_DIR}/daily" "couchdb_${DATE}"
rm -rf "${COUCH_DIR}"
COUCH_SIZE=$(du -h "${COUCH_FILE}" | cut -f1)
echo "      CouchDB: ${COUCH_FILE} (${COUCH_SIZE}, ${DB_COUNT} databases)"

# ─── 3. Weekly copy (every Sunday) ──────────────────────
if [ "${DAY_OF_WEEK}" = "7" ]; then
  echo "[3/3] Creating weekly backup copy..."
  cp "${PG_FILE}" "${BACKUP_DIR}/weekly/postgres_${DATE}.sql.gz"
  cp "${COUCH_FILE}" "${BACKUP_DIR}/weekly/couchdb_${DATE}.tar.gz"
  echo "      Weekly copies created."
else
  echo "[3/3] Not Sunday — skipping weekly copy."
fi

# ─── 4. Rotate old backups ──────────────────────────────
echo "Rotating old backups..."

# Daily: keep last N days
cd "${BACKUP_DIR}/daily"
ls -t postgres_*.sql.gz 2>/dev/null | tail -n +$((DAILY_KEEP + 1)) | xargs -r rm -f
ls -t couchdb_*.tar.gz 2>/dev/null | tail -n +$((DAILY_KEEP + 1)) | xargs -r rm -f

# Weekly: keep last N weeks
if ls "${BACKUP_DIR}/weekly"/postgres_*.sql.gz 1>/dev/null 2>&1; then
  cd "${BACKUP_DIR}/weekly"
  ls -t postgres_*.sql.gz 2>/dev/null | tail -n +$((WEEKLY_KEEP + 1)) | xargs -r rm -f
  ls -t couchdb_*.tar.gz 2>/dev/null | tail -n +$((WEEKLY_KEEP + 1)) | xargs -r rm -f
fi

# ─── Done ────────────────────────────────────────────────
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo ""
echo "=== Backup complete! Total backup size: ${TOTAL_SIZE} ==="
echo "    Daily backups:  $(ls ${BACKUP_DIR}/daily/postgres_*.sql.gz 2>/dev/null | wc -l) PostgreSQL, $(ls ${BACKUP_DIR}/daily/couchdb_*.tar.gz 2>/dev/null | wc -l) CouchDB"
echo "    Weekly backups: $(ls ${BACKUP_DIR}/weekly/postgres_*.sql.gz 2>/dev/null | wc -l) PostgreSQL, $(ls ${BACKUP_DIR}/weekly/couchdb_*.tar.gz 2>/dev/null | wc -l) CouchDB"
