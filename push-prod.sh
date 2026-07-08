#!/usr/bin/env bash
set -euo pipefail

# === BookTracker — push prod ===
# Tokens read from .env.local.prod at repo root. Add to .env.local.prod:
#   TURSO_DATABASE_URL=libsql://...   (turso db show booktracker --url)
#   TURSO_AUTH_TOKEN=...              (turso db tokens create booktracker)
#   GOOGLE_BOOKS_API_KEY=...          (Google Cloud Console)
#   VERCEL_TOKEN=...                  (https://vercel.com/account/settings/tokens)
#   VERCEL_EMAIL=...                  (Vercel account email, must match git config user.email)

if [ ! -f .env.local.prod ]; then
  echo "✗ .env.local.prod not found at repo root."
  echo "  Copy .env.local.example to .env.local.prod and fill in production values."
  exit 1
fi
set -a
source .env.local.prod
set +a

: "${TURSO_DATABASE_URL:?✗ TURSO_DATABASE_URL missing in .env.local.prod}"
: "${TURSO_AUTH_TOKEN:?✗ TURSO_AUTH_TOKEN missing in .env.local.prod}"
: "${GOOGLE_BOOKS_API_KEY:?✗ GOOGLE_BOOKS_API_KEY missing in .env.local.prod}"
: "${VERCEL_TOKEN:?✗ VERCEL_TOKEN missing in .env.local.prod}"
: "${VERCEL_EMAIL:?✗ VERCEL_EMAIL missing in .env.local.prod}"

echo "=== BookTracker — Pre-deploy checks ==="

BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "✗ You are on '$BRANCH', not 'main'. Merge your PR first."
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Working directory is dirty. Commit or stash changes first."
  exit 1
fi
GIT_EMAIL=$(git config user.email)
if [ "$GIT_EMAIL" != "$VERCEL_EMAIL" ]; then
  echo "✗ git user.email ($GIT_EMAIL) does not match VERCEL_EMAIL ($VERCEL_EMAIL)."
  echo "  → git config user.email \"$VERCEL_EMAIL\""
  exit 1
fi

echo "→ Pulling latest main..."
git pull origin main
echo "→ Lint..."
pnpm lint
echo "→ TypeScript..."
pnpm typecheck
echo "→ Build..."
pnpm build

echo ""
echo "=== Checks passed. Pushing migrations to Turso... ==="
pnpm db:push

echo ""
echo "=== Deploying to Vercel... ==="
vercel --prod --yes --token "$VERCEL_TOKEN"

echo ""
echo "=== Done ==="
