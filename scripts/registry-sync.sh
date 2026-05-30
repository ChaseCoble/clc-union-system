#!/usr/bin/env bash
# registry-sync.sh
# Reconciles local Docker registry against supply-chain-docker.json
# Detects new images, digest changes, missing SBOMs.
# Cross-references digest across JSON, registry manifest, and SBOM.
#
# Backup policy:
#   New image       — backup JSON + registry
#   Digest mismatch — backup JSON only
#   Missing SBOM    — no backup, regenerate only
#
# Run as: union-supply-chain (no sudo)
# Managed by: systemd timer

set -euo pipefail

ENV_FILE="/srv/union/scripts/.env"
LOG_FILE="/srv/union/data/s/infra/logs/registry-sync.log"
PYTHON=/usr/bin/python3
CURL=/usr/bin/curl
SYFT=/usr/local/bin/syft

# --- Logging ---
log() {
    local level="$1"
    shift
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [$level] $*" >> "$LOG_FILE"
}

# --- Load env ---
if [[ ! -f "$ENV_FILE" ]]; then
    log "ERROR" "Env file not found at $ENV_FILE — aborting"
    exit 1
fi
source "$ENV_FILE"

SUPPLY_CHAIN_FILE="$SUPPLY_CHAIN_BASE/supply-chain-docker.json"
SBOM_DIR="$SUPPLY_CHAIN_BASE/sboms"
BACKUP_DIR="$SUPPLY_CHAIN_BASE/backups"
REGISTRY_DIR="$REGISTRY_DATA_PATH"
REGISTRY_URL="http://localhost:${REGISTRY_PORT:-5000}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SAFE_TIMESTAMP=$(echo "$TIMESTAMP" | tr ':' '-')
CHANGES=0
ERRORS=0

mkdir -p "$SBOM_DIR" "$BACKUP_DIR"

# --- Ensure supply chain file exists ---
if [[ ! -f "$SUPPLY_CHAIN_FILE" ]]; then
    echo '{"entries": []}' > "$SUPPLY_CHAIN_FILE"
    log "INFO" "Created new supply chain file at $SUPPLY_CHAIN_FILE"
fi

# --- Backup functions ---
# backup_json  — digest mismatch or missing SBOM
# backup_full  — new image discovery (JSON + registry)

json_backup_triggered=0
backup_json() {
    if [[ $json_backup_triggered -eq 1 ]]; then return; fi
    json_backup_triggered=1
    log "INFO" "Backing up supply chain JSON..."
    cp "$SUPPLY_CHAIN_FILE" "$BACKUP_DIR/supply-chain-docker.$SAFE_TIMESTAMP.bak"
    log "INFO" "JSON backed up to $BACKUP_DIR/supply-chain-docker.$SAFE_TIMESTAMP.bak"
}

registry_backup_triggered=0
backup_full() {
    backup_json
    if [[ $registry_backup_triggered -eq 1 ]]; then return; fi
    registry_backup_triggered=1
    if [[ -d "$REGISTRY_DIR" ]]; then
        log "INFO" "Backing up registry data..."
        tar -czf "$BACKUP_DIR/docker-registry.$SAFE_TIMESTAMP.tar.gz" \
            -C "$(dirname "$REGISTRY_DIR")" "$(basename "$REGISTRY_DIR")" 2>> "$LOG_FILE"
        log "INFO" "Registry backed up to $BACKUP_DIR/docker-registry.$SAFE_TIMESTAMP.tar.gz"
    else
        log "WARN" "Registry data directory not found at $REGISTRY_DIR — skipping registry backup"
    fi
}

# --- Generate SBOM via registry (no Docker socket) ---
generate_sbom() {
    local image="$1"
    local sbom_path="$2"
    log "INFO" "Generating SBOM for $image..."
    if "$SYFT" "registry:localhost:${REGISTRY_PORT:-5000}/$image" -o json > "$sbom_path" 2>> "$LOG_FILE"; then
        log "INFO" "SBOM generated at $sbom_path"
        echo "ok"
    else
        log "ERROR" "SBOM generation failed for $image"
        echo "failed"
    fi
}

# --- Extract digest from SBOM ---
sbom_digest() {
    local sbom_path="$1"
    "$PYTHON" -c "
import json
with open('$sbom_path') as f:
    data = json.load(f)
digests = data.get('source', {}).get('metadata', {}).get('repoDigests', [])
if digests:
    print(digests[0].split('@')[-1])
else:
    print('unknown')
" 2>/dev/null || echo "unknown"
}

# --- Fetch catalog ---
log "INFO" "Starting registry sync — $TIMESTAMP"

CATALOG=$("$CURL" -sf "$REGISTRY_URL/v2/_catalog" 2>> "$LOG_FILE" || echo '{"repositories":[]}')
REPOS=$("$PYTHON" -c "
import json
repos = json.loads('''$CATALOG''').get('repositories', [])
print('\n'.join(repos))
" 2>/dev/null || true)

if [[ -z "$REPOS" ]]; then
    log "INFO" "No repositories found in registry — nothing to sync"
    exit 0
fi

# --- Process each repo and tag ---
while IFS= read -r REPO; do
    TAGS_JSON=$("$CURL" -sf "$REGISTRY_URL/v2/$REPO/tags/list" 2>> "$LOG_FILE" || echo '{"tags":[]}')
    TAGS=$("$PYTHON" -c "
import json
tags = json.loads('''$TAGS_JSON''').get('tags') or []
print('\n'.join(tags))
" 2>/dev/null || true)

    if [[ -z "$TAGS" ]]; then
        log "INFO" "$REPO — no tags, skipping"
        continue
    fi

    while IFS= read -r TAG; do
        IMAGE="$REPO:$TAG"
        SAFE_NAME=$(echo "$IMAGE" | tr ':/' '--')
        SBOM_PATH="$SBOM_DIR/${SAFE_NAME}-sbom.json"

        # Get digest from registry — try all manifest types
        REGISTRY_DIGEST=""
        for ACCEPT in \
            "application/vnd.oci.image.manifest.v1+json" \
            "application/vnd.oci.image.index.v1+json" \
            "application/vnd.docker.distribution.manifest.v2+json"; do

            REGISTRY_DIGEST=$("$CURL" -sf \
                -H "Accept: $ACCEPT" \
                -D - \
                "$REGISTRY_URL/v2/$REPO/manifests/$TAG" 2>> "$LOG_FILE" \
                | grep -i "^docker-content-digest:" \
                | tr -d '[:space:]' | cut -d: -f2- | tr -d '\r' || true)

            [[ -n "$REGISTRY_DIGEST" ]] && break
        done

        if [[ -z "$REGISTRY_DIGEST" ]]; then
            log "WARN" "$IMAGE — could not retrieve digest from registry, skipping"
            ERRORS=$((ERRORS + 1))
            continue
        fi

        # Look up existing entry
        EXISTING=$("$PYTHON" -c "
import json
with open('$SUPPLY_CHAIN_FILE') as f:
    data = json.load(f)
matches = [e for e in data['entries'] if e.get('local_tag') == 'localhost:${REGISTRY_PORT:-5000}/$IMAGE']
print(json.dumps(matches[0]) if matches else 'null')
")

        if [[ "$EXISTING" == "null" ]]; then
            # --- New image ---
            log "INFO" "NEW: $IMAGE (digest: $REGISTRY_DIGEST)"
            backup_full
            CHANGES=$((CHANGES + 1))

            SBOM_STATUS=$(generate_sbom "$IMAGE" "$SBOM_PATH")
            SBOM_DIGEST="unknown"
            if [[ "$SBOM_STATUS" == "ok" ]]; then
                SBOM_DIGEST=$(sbom_digest "$SBOM_PATH")
            else
                SBOM_PATH="FAILED"
            fi

            ID=$("$PYTHON" -c "import uuid; print(uuid.uuid4())")
            "$PYTHON" - << PYEOF
import json
with open('$SUPPLY_CHAIN_FILE') as f:
    data = json.load(f)
data['entries'].append({
    'id':              '$ID',
    'name':            '$IMAGE',
    'type':            'docker-image',
    'source':          '',
    'local_tag':       'localhost:${REGISTRY_PORT:-5000}/$IMAGE',
    'digest':          '$REGISTRY_DIGEST',
    'sbom_path':       '$SBOM_PATH',
    'sbom_digest':     '$SBOM_DIGEST',
    'ingested_at':     '$TIMESTAMP',
    'ingested_by':     'registry-sync',
    'last_checked_at': '$TIMESTAMP',
    'notes':           'auto-discovered by registry-sync'
})
with open('$SUPPLY_CHAIN_FILE', 'w') as f:
    json.dump(data, f, indent=2)
PYEOF
            log "INFO" "NEW entry written for $IMAGE"

        else
            # --- Existing entry ---
            STORED_DIGEST=$("$PYTHON" -c "import json; print(json.loads('''$EXISTING''').get('digest',''))")
            STORED_SBOM=$("$PYTHON" -c "import json; print(json.loads('''$EXISTING''').get('sbom_path',''))")

            DIGEST_MATCH=1
            SBOM_OK=1

            # Check registry vs stored digest
            if [[ "$STORED_DIGEST" != "$REGISTRY_DIGEST" ]]; then
                log "WARN" "CHANGED: $IMAGE — registry digest differs (stored: $STORED_DIGEST, registry: $REGISTRY_DIGEST)"
                DIGEST_MATCH=0
            fi

            # Check SBOM exists on disk
            if [[ -z "$STORED_SBOM" || "$STORED_SBOM" == "FAILED" || ! -f "$STORED_SBOM" ]]; then
                log "WARN" "$IMAGE — SBOM missing or failed, regenerating"
                SBOM_OK=0
            else
                # Cross-reference SBOM digest against registry
                SBOM_DIGEST=$(sbom_digest "$STORED_SBOM")
                if [[ "$SBOM_DIGEST" != "unknown" && "$SBOM_DIGEST" != "$REGISTRY_DIGEST" ]]; then
                    log "WARN" "$IMAGE — SBOM digest differs from registry (sbom: $SBOM_DIGEST, registry: $REGISTRY_DIGEST)"
                    SBOM_OK=0
                fi
            fi

            if [[ $DIGEST_MATCH -eq 0 && $SBOM_OK -eq 1 ]]; then
                # Digest mismatch only — backup JSON, update entry and SBOM
                backup_json
                CHANGES=$((CHANGES + 1))
                SBOM_STATUS=$(generate_sbom "$IMAGE" "$SBOM_PATH")
                NEW_SBOM_DIGEST="unknown"
                if [[ "$SBOM_STATUS" == "ok" ]]; then
                    NEW_SBOM_DIGEST=$(sbom_digest "$SBOM_PATH")
                else
                    SBOM_PATH="FAILED"
                fi
                "$PYTHON" - << PYEOF
import json
with open('$SUPPLY_CHAIN_FILE') as f:
    data = json.load(f)
for entry in data['entries']:
    if entry.get('local_tag') == 'localhost:${REGISTRY_PORT:-5000}/$IMAGE':
        entry['digest']          = '$REGISTRY_DIGEST'
        entry['sbom_path']       = '$SBOM_PATH'
        entry['sbom_digest']     = '$NEW_SBOM_DIGEST'
        entry['last_checked_at'] = '$TIMESTAMP'
        entry['last_changed_at'] = '$TIMESTAMP'
        break
with open('$SUPPLY_CHAIN_FILE', 'w') as f:
    json.dump(data, f, indent=2)
PYEOF
                log "INFO" "UPDATED: $IMAGE — digest changed, entry and SBOM refreshed"

            elif [[ $SBOM_OK -eq 0 ]]; then
                # SBOM missing or mismatched — regenerate only, no backup
                CHANGES=$((CHANGES + 1))
                SBOM_STATUS=$(generate_sbom "$IMAGE" "$SBOM_PATH")
                NEW_SBOM_DIGEST="unknown"
                if [[ "$SBOM_STATUS" == "ok" ]]; then
                    NEW_SBOM_DIGEST=$(sbom_digest "$SBOM_PATH")
                else
                    SBOM_PATH="FAILED"
                fi
                "$PYTHON" - << PYEOF
import json
with open('$SUPPLY_CHAIN_FILE') as f:
    data = json.load(f)
for entry in data['entries']:
    if entry.get('local_tag') == 'localhost:${REGISTRY_PORT:-5000}/$IMAGE':
        entry['sbom_path']       = '$SBOM_PATH'
        entry['sbom_digest']     = '$NEW_SBOM_DIGEST'
        entry['last_checked_at'] = '$TIMESTAMP'
        break
with open('$SUPPLY_CHAIN_FILE', 'w') as f:
    json.dump(data, f, indent=2)
PYEOF
                log "INFO" "UPDATED: $IMAGE — SBOM regenerated"

            else
                # All clean — update last_checked_at only
                "$PYTHON" - << PYEOF
import json
with open('$SUPPLY_CHAIN_FILE') as f:
    data = json.load(f)
for entry in data['entries']:
    if entry.get('local_tag') == 'localhost:${REGISTRY_PORT:-5000}/$IMAGE':
        entry['last_checked_at'] = '$TIMESTAMP'
        break
with open('$SUPPLY_CHAIN_FILE', 'w') as f:
    json.dump(data, f, indent=2)
PYEOF
                log "INFO" "OK: $IMAGE — all three digests verified"
            fi
        fi

    done <<< "$TAGS"
done <<< "$REPOS"

log "INFO" "Sync complete — changes: $CHANGES, errors: $ERRORS"
