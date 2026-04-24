#!/bin/bash
# Enable CORS on CouchDB for PouchDB browser sync
# Runs via docker exec so it works regardless of port exposure

set -e

COUCH_USER="${COUCHDB_USERNAME:-admin}"
COUCH_PASS="${COUCHDB_PASSWORD:-password}"
CONTAINER="${COUCHDB_CONTAINER:-gonok-couchdb-1}"
AUTH_URL="http://${COUCH_USER}:${COUCH_PASS}@localhost:5984"

echo "Initializing CouchDB via container ${CONTAINER}..."

# Create required system databases (silently skip if they already exist)
docker exec "$CONTAINER" curl -sf -X PUT "${AUTH_URL}/_users" > /dev/null 2>&1 || true
docker exec "$CONTAINER" curl -sf -X PUT "${AUTH_URL}/_replicator" > /dev/null 2>&1 || true
docker exec "$CONTAINER" curl -sf -X PUT "${AUTH_URL}/_global_changes" > /dev/null 2>&1 || true

# Enable CORS
docker exec "$CONTAINER" curl -sf -X PUT "${AUTH_URL}/_node/_local/_config/httpd/enable_cors" -d '"true"'
docker exec "$CONTAINER" curl -sf -X PUT "${AUTH_URL}/_node/_local/_config/cors/origins" -d '"*"'
docker exec "$CONTAINER" curl -sf -X PUT "${AUTH_URL}/_node/_local/_config/cors/credentials" -d '"true"'
docker exec "$CONTAINER" curl -sf -X PUT "${AUTH_URL}/_node/_local/_config/cors/methods" -d '"GET, PUT, POST, HEAD, DELETE"'
docker exec "$CONTAINER" curl -sf -X PUT "${AUTH_URL}/_node/_local/_config/cors/headers" -d '"accept, authorization, content-type, origin, referer"'

echo ""
echo "CouchDB initialized: system databases created + CORS enabled."
