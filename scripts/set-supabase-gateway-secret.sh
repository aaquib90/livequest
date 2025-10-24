#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="liveblogo"
ENVIRONMENT="${1:-production}"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required but not installed. Install Node.js/npm first." >&2
  exit 1
fi

if ! npx wrangler --version >/dev/null 2>&1; then
  echo "Wrangler CLI is required. Install it with 'npm install -g wrangler' or add it to devDependencies." >&2
  exit 1
fi

if [[ -n "${SUPABASE_GATEWAY_SECRET:-}" ]]; then
  SECRET_VALUE="${SUPABASE_GATEWAY_SECRET}"
else
  read -r -s -p "Enter SUPABASE_GATEWAY_SECRET: " SECRET_VALUE
  echo
fi

if [[ -z "${SECRET_VALUE}" ]]; then
  echo "SUPABASE_GATEWAY_SECRET cannot be empty." >&2
  exit 1
fi

printf '%s' "${SECRET_VALUE}" | npx wrangler pages secret put SUPABASE_GATEWAY_SECRET \
  --project "${PROJECT_NAME}" \
  --env "${ENVIRONMENT}"

echo "SUPABASE_GATEWAY_SECRET stored for ${PROJECT_NAME} (${ENVIRONMENT})."
