#!/bin/bash
# Enable CORS on CouchDB for PouchDB browser sync
# Run after CouchDB container is healthy

set -e

COUCH_URL="${COUCHDB_URL:-http://localhost:5984}"
COUCH_USER="${COUCHDB_USERNAME:-admin}"
COUCH_PASS="${COUCHDB_PASSWORD:-password}"
AUTH_URL="http://${COUCH_USER}:${COUCH_PASS}@$(echo "$COUCH_URL" | sed 's|http://||')"

echo "Enabling CouchDB CORS at ${COUCH_URL}..."

curl -sf -X PUT "${AUTH_URL}/_node/_local/_config/httpd/enable_cors" -d '"true"'
curl -sf -X PUT "${AUTH_URL}/_node/_local/_config/cors/origins" -d '"*"'
curl -sf -X PUT "${AUTH_URL}/_node/_local/_config/cors/credentials" -d '"true"'
curl -sf -X PUT "${AUTH_URL}/_node/_local/_config/cors/methods" -d '"GET, PUT, POST, HEAD, DELETE"'
curl -sf -X PUT "${AUTH_URL}/_node/_local/_config/cors/headers" -d '"accept, authorization, content-type, origin, referer"'

echo "CouchDB CORS enabled successfully."
