#!/bin/bash
# Setup automated daily backup cron job
# Run once on the EC2 server: bash scripts/setup-backup-cron.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup.sh"
LOG_FILE="/var/log/gonok-backup.log"
CRON_SCHEDULE="0 3 * * *"  # 3:00 AM daily (Bangladesh is UTC+6, so 3 AM BDT = 9 PM UTC)

echo "Setting up Gonok automated backup..."

# Ensure backup script is executable
chmod +x "${BACKUP_SCRIPT}"

# Create backup directory
sudo mkdir -p /backups/gonok/daily /backups/gonok/weekly
sudo chown -R "$(whoami):$(whoami)" /backups/gonok

# Create log file
sudo touch "${LOG_FILE}"
sudo chown "$(whoami):$(whoami)" "${LOG_FILE}"

# Load env vars from .env.prod if available
ENV_LOADER=""
if [ -f "${SCRIPT_DIR}/../.env.prod" ]; then
  ENV_LOADER="set -a && source ${SCRIPT_DIR}/../.env.prod && set +a && "
fi

# Build cron entry
CRON_ENTRY="${CRON_SCHEDULE} ${ENV_LOADER}${BACKUP_SCRIPT} >> ${LOG_FILE} 2>&1"

# Add to crontab (avoid duplicates)
(crontab -l 2>/dev/null | grep -v "backup.sh" || true; echo "${CRON_ENTRY}") | crontab -

echo ""
echo "Backup cron job installed:"
echo "  Schedule: Daily at 3:00 AM"
echo "  Script:   ${BACKUP_SCRIPT}"
echo "  Log:      ${LOG_FILE}"
echo "  Storage:  /backups/gonok/ (7 daily + 4 weekly)"
echo ""
echo "Verify with: crontab -l"
echo "Test now:    ${BACKUP_SCRIPT}"
