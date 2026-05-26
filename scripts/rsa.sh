#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/.env"

SECURE_LOC=$SECURE_LOC

if [ ! -d "$SECURE_LOC" ]; then
    echo "$SECURE_LOC not available"
    exit 1
fi

PRIVATE_KEY="$SECURE_LOC/$PRIVATE_KEY_NAME"
PUBLIC_KEY="$SECURE_LOC/$PUBLIC_KEY_NAME"

if [ -f "$PRIVATE_KEY" ]; then
    echo "ERROR: Private key already exists at $PRIVATE_KEY. Refusing to overwrite."
    echo "Delete manually if you intend to rotate keys."
    exit 1
fi

openssl genrsa -out "$PRIVATE_KEY" 4096
openssl rsa -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY"

chmod 600 "$PRIVATE_KEY"
chmod 644 "$PUBLIC_KEY"

echo "Keypair generated:"
echo "  Private: $PRIVATE_KEY"
echo "  Public:  $PUBLIC_KEY"
echo ""
echo "Distribute the public key to services that need JWT validation."
echo "The private key never leaves the secure service."
