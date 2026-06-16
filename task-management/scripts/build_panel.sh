#!/usr/bin/env bash
# build_panel.sh
# Builds the task management panel React source into static/panel.js
# Uses base-frontend image — no separate node install needed.
# Run whenever panel source changes.

set -euo pipefail


PANEL_SRC="/srv/union/task-management/frontend/tm-panel"
PANEL_OUT="/srv/union/task-management/frontend/static"
REGISTRY=localhost:5000

echo "[panel-build] Starting panel build..."

docker run --rm \
  -v "${PANEL_SRC}:/app/project" \
  -v "${PANEL_OUT}:/output" \
  "${REGISTRY}/base-frontend:latest" \
  sh -c '
node -e "
const base = require('"'"'./package.json'"'"');
const project = require('"'"'./project/package.json'"'"');
const merged = Object.assign({}, base, {
  name: project.name,
  version: project.version,
  scripts: Object.assign({}, base.scripts, project.scripts),
  dependencies: Object.assign({}, base.dependencies || {}, project.dependencies || {}),
  devDependencies: Object.assign({}, base.devDependencies || {}, project.devDependencies || {})
});
require('"'"'fs'"'"').writeFileSync('"'"'./package.json'"'"', JSON.stringify(merged, null, 2));
" && \
cp -r /app/project/src /app/src && \
cp /app/project/vite.config.js /app/vite.config.js && \
npm install && \
npm run build && \
cp /static/panel.js /output/panel.js
'

echo "[panel-build] Done. Panel at ${PANEL_OUT}/panel.js"
