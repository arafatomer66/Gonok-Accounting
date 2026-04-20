#!/bin/bash
set -e

# ─── Gonok Production Deployment Script ───
# Usage: ./scripts/deploy.sh <server-ip> [ssh-key-path]
#
# Prerequisites:
#   - EC2 instance running (via terraform apply)
#   - .env.prod file ready on server
#   - SSH key configured

SERVER_IP="${1:?Usage: ./scripts/deploy.sh <server-ip> [ssh-key-path]}"
SSH_KEY="${2:-~/.ssh/gonok.pem}"
REPO_URL="https://github.com/arafatomer66/Gonok-Accounting.git"
APP_DIR="/home/ubuntu/gonok"

echo "🚀 Deploying Gonok to ${SERVER_IP}..."

SSH_CMD="ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ubuntu@${SERVER_IP}"

# Clone or pull latest code
echo "📦 Updating code..."
${SSH_CMD} "
  if [ -d ${APP_DIR} ]; then
    cd ${APP_DIR} && git pull origin main
  else
    git clone ${REPO_URL} ${APP_DIR}
  fi
"

# Build and start containers
echo "🐳 Building and starting containers..."
${SSH_CMD} "
  cd ${APP_DIR}
  docker compose -f docker-compose.prod.yml build
  docker compose -f docker-compose.prod.yml up -d
"

# Wait for services to start
echo "⏳ Waiting for services..."
sleep 10

# Health check
echo "🏥 Running health check..."
HEALTH=$(${SSH_CMD} "curl -s http://localhost/api/health" 2>/dev/null || echo "failed")

if echo "${HEALTH}" | grep -q '"status":"ok"'; then
  echo ""
  echo "✅ Deployment successful!"
  echo "   App: http://${SERVER_IP}"
  echo "   API: http://${SERVER_IP}/api/health"
else
  echo ""
  echo "⚠️  Health check failed. Check logs with:"
  echo "   ${SSH_CMD} 'cd ${APP_DIR} && docker compose -f docker-compose.prod.yml logs'"
fi
