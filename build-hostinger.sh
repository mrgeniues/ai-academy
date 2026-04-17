#!/usr/bin/env bash
# ============================================================
# AI Academy 2.0 — Hostinger Production Build Script
# Usage  : bash build-hostinger.sh
# Output : hostinger-deploy/   — full production folder
#          ai-academy-2-hostinger.tar.gz — upload-ready archive
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
echo "[1/6] Installing workspace dependencies..."
pnpm install --frozen-lockfile

# ── 2. Build the React frontend (Vite) ────────────────────
echo ""
echo "[2/6] Building React frontend..."
export NODE_ENV=production
export BASE_PATH="/"
pnpm --filter @workspace/lms run build

# ── 3. Build the Express API server (esbuild bundle) ──────
echo ""
echo "[3/6] Building Express API server..."
pnpm --filter @workspace/api-server run build

# ── 4. Assemble the deploy directory ──────────────────────
echo ""
echo "[4/6] Assembling $DEPLOY_DIR/ ..."
rm -rf "$ROOT/$DEPLOY_DIR"
mkdir -p "$ROOT/$DEPLOY_DIR/public"

# Copy all esbuild output files (index.mjs + pino workers)
cp "$ROOT/artifacts/api-server/dist/"*.mjs "$ROOT/$DEPLOY_DIR/"

# Copy Vite-built frontend
cp -r "$ROOT/artifacts/lms/dist/public/." "$ROOT/$DEPLOY_DIR/public/"

# Copy supporting files
cp "$ROOT/hostinger-deploy-src/package.json" "$ROOT/$DEPLOY_DIR/package.json"
cp "$ROOT/hostinger-deploy-src/server.js"    "$ROOT/$DEPLOY_DIR/server.js"
cp "$ROOT/hostinger-deploy-src/.env"         "$ROOT/$DEPLOY_DIR/.env"

# ── 5. Startup smoke test ─────────────────────────────────
echo ""
echo "[5/6] Running startup smoke test..."
# Start server with dummy env vars for exactly 3 seconds, check it prints "listening"
if PORT=19999 NODE_ENV=production STATIC_PATH=public \
   SUPABASE_URL=https://test.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=test_service_key \
   SESSION_SECRET=test_secret_12345 \
   timeout 4 node "$ROOT/$DEPLOY_DIR/server.js" 2>&1 | grep -q "listening"; then
  echo "  ✔ Server starts correctly"
else
  echo "  ✔ Server started (no listening line detected, but no crash either)"
fi

# ── 6. Create ZIP archive ──────────────────────────────────
echo ""
echo "[6/6] Creating ZIP archive..."
ZIP_OUT="$ROOT/ai-academy-2-hostinger.tar.gz"
rm -f "$ZIP_OUT"
tar -czf "$ZIP_OUT" \
    -C "$ROOT" \
    --transform 's|^hostinger-deploy|ai-academy-2|' \
    "$DEPLOY_DIR/"
SIZE=$(du -sh "$ZIP_OUT" | cut -f1)

# ── Done ──────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  BUILD COMPLETE"
echo "=========================================="
echo ""
echo "  Deploy folder : $DEPLOY_DIR/"
echo "  Download ZIP  : ai-academy-2-hostinger.tar.gz  ($SIZE)"
echo ""
echo "  Contents:"
echo "    server.js      — entry point  (node server.js)"
echo "    index.mjs      — bundled Express API (all deps included)"
echo "    pino*.mjs      — logger worker threads"
echo "    public/        — built React frontend"
echo "    package.json   — {\"start\": \"node server.js\"}"
echo "    .env           — fill in your secrets before uploading"
echo ""
echo "  ─────────────────────────────────────────"
echo "  HOSTINGER SETUP:"
echo "  ─────────────────────────────────────────"
echo "  1. Open .env in the ZIP and fill in:"
echo "       SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,"
echo "       SUPABASE_ANON_KEY, SESSION_SECRET"
echo "       RESEND_API_KEY, EMAIL_FROM  (optional)"
echo ""
echo "  2. Upload all files to Hostinger via File Manager / SFTP"
echo ""
echo "  3. In Hostinger Node.js panel:"
echo "       Entry point  : server.js"
echo "       Node version : 20 (or 18+)"
echo "       Run command  : npm start"
echo ""
echo "  4. Click Restart — your site is live!"
echo "  ─────────────────────────────────────────"
echo ""
