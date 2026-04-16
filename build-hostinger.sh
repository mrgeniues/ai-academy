#!/usr/bin/env bash
# ============================================================
# AI Academy 2.0 — Hostinger Production Build Script
# Usage: bash build-hostinger.sh
# Output: hostinger-deploy/ — upload this folder to Hostinger
# ============================================================
set -euo pipefail

DEPLOY_DIR="hostinger-deploy"
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "=========================================="
echo "  AI Academy 2.0 — Hostinger Build"
echo "=========================================="
echo ""

# ── 1. Install all workspace dependencies ─────────────────
echo "[1/5] Installing workspace dependencies..."
pnpm install --frozen-lockfile

# ── 2. Build the React frontend (Vite) ────────────────────
echo ""
echo "[2/5] Building React frontend..."
# For production on Hostinger the app is served at root (/), no BASE_PATH needed
export NODE_ENV=production
export BASE_PATH="/"
# SUPABASE env vars must be set before building so they are embedded in the bundle
# If not set, the frontend will still build but Supabase client-side calls won't work
pnpm --filter @workspace/lms run build

# ── 3. Build the Express API server (esbuild bundle) ──────
echo ""
echo "[3/5] Building Express API server..."
pnpm --filter @workspace/api-server run build

# ── 4. Assemble the deploy directory ──────────────────────
echo ""
echo "[4/5] Assembling $DEPLOY_DIR/ ..."
rm -rf "$ROOT/$DEPLOY_DIR"
mkdir -p "$ROOT/$DEPLOY_DIR/public"

# Copy all esbuild output files (index.mjs + pino workers)
cp "$ROOT/artifacts/api-server/dist/"*.mjs "$ROOT/$DEPLOY_DIR/"

# Copy Vite-built frontend
cp -r "$ROOT/artifacts/lms/dist/public/." "$ROOT/$DEPLOY_DIR/public/"

# Copy supporting files
cp "$ROOT/hostinger-deploy-src/package.json" "$ROOT/$DEPLOY_DIR/package.json"
cp "$ROOT/hostinger-deploy-src/server.js"    "$ROOT/$DEPLOY_DIR/server.js"
cp "$ROOT/hostinger-deploy-src/.env.example" "$ROOT/$DEPLOY_DIR/.env.example"

# ── 5. Done ───────────────────────────────────────────────
echo ""
echo "[5/5] Build complete!"
echo ""
echo "  Deploy folder : $DEPLOY_DIR/"
echo "  Entry point   : server.js  (runs \`node server.js\`)"
echo "  Static files  : public/"
echo ""
echo "  Next steps:"
echo "  1. Create a .env file in $DEPLOY_DIR/ (copy .env.example and fill in values)"
echo "  2. Upload the entire $DEPLOY_DIR/ folder to Hostinger via File Manager or SFTP"
echo "  3. In Hostinger Node.js settings:"
echo "       Entry point : server.js"
echo "       Node version: 18+ (20 recommended)"
echo "  4. Set all environment variables in Hostinger's panel (see .env.example)"
echo "  5. Click 'Restart' in Hostinger Node.js panel"
echo ""
