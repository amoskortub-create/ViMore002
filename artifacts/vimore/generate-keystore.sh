#!/bin/bash

# Generate keystore for signing
KEYSTORE_PASSWORD="${1:-VimoreApp2024}"
KEY_ALIAS="${2:-release}"
KEY_PASSWORD="${3:-VimoreApp2024}"

cd android/app

# Generate keystore
keytool -genkey -v -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias "$KEY_ALIAS" \
  -dname "CN=VimoreApp, OU=Development, O=VimoreApp, L=Cairo, ST=Cairo, C=EG" \
  -storepass "$KEYSTORE_PASSWORD" \
  -keypass "$KEY_PASSWORD"

# Verify keystore
keytool -list -v -keystore release.keystore -storepass "$KEYSTORE_PASSWORD"

# Encode to base64 for GitHub secrets
echo "Base64 encoded keystore (add to GitHub secrets as RELEASE_KEYSTORE_BASE64):"
base64 -i release.keystore

echo ""
echo "Store these values:"
echo "KEYSTORE_PASSWORD: $KEYSTORE_PASSWORD"
echo "KEY_ALIAS: $KEY_ALIAS"
echo "KEY_PASSWORD: $KEY_PASSWORD"
