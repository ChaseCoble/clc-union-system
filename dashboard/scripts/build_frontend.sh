#!/usr/bin/env bash
# build-frontend.sh
# Builds the dashboard React frontend using the base-frontend image.
# Output goes to /srv/union/dashboard/static/
# Run this whenever frontend source changes.

set -euo pipefail

source "$(dirname "$0")/.env"


echo "[build] Starting frontend build..."

docker run --rm \
  -v "${FRONTEND_SRC}:/app/project" \
  -v "${STATIC_OUT}:/output" \
  "${REGISTRY}/base-frontend:latest" \
  sh -c '
node -e "
const base = require('"'"'./package.json'"'"');
const project = require('"'"'./project/package.json'"'"');
const merged = Object.assign({}, base, {
  name: project.name,
  version: project.version,
  scripts: Object.assign({}, base.scripts, project.scripts)
});
require('"'"'fs'"'"').writeFileSync('"'"'./package.json'"'"', JSON.stringify(merged, null, 2));
" && \
cp -r /app/project/src /app/src && \
cp /app/project/index.html /app/index.html && \
cp /app/project/vite.config.js /app/vite.config.js && \
npm run build && \
cp -r /static/. /output/
'

echo "[build] Done. Static files at ${STATIC_OUT}"
