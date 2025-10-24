#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"/..

WEB_DIR="web"
EXAMPLE="$WEB_DIR/.env.example"
LOCAL="$WEB_DIR/.env.local"

if [ ! -f "$EXAMPLE" ]; then
  echo "Missing $EXAMPLE. Please create it first." >&2
  exit 1
fi

if [ -f "$LOCAL" ]; then
  echo "$LOCAL already exists. Skipping copy."
else
  cp "$EXAMPLE" "$LOCAL"
  echo "Created $LOCAL from template."
fi

echo "Ensure the following are set in $LOCAL:"
cat <<EOF
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only)
- NEXT_PUBLIC_BASE_URL (e.g. http://localhost:3000)
- EMBED_ALLOW_ORIGINS (optional, comma-separated)
- NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT (optional)
EOF
