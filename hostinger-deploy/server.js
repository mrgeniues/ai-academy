/**
 * AI Academy 2.0 — Hostinger Production Entry Point
 * Run with: node server.js
 *
 * This file:
 *  1. Loads .env (if present) without any external dependency
 *  2. Sets safe defaults for required env vars
 *  3. Launches the bundled Express app (index.mjs)
 *  4. Handles uncaught errors so the process never silently dies
 */

"use strict";

// ── 1. Load .env file (no dotenv dependency needed) ──────────────────────────
const fs   = require("fs");
const path = require("path");

const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, "utf8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;           // skip blanks & comments
    const eqIdx = line.indexOf("=");
    if (eqIdx < 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let   val = line.slice(eqIdx + 1).trim();
    // Strip surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Only set if not already provided by the environment (panel values win)
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// ── 2. Apply defaults for vars Hostinger provides automatically ───────────────
process.env.PORT        = process.env.PORT        || "3000";
process.env.NODE_ENV    = process.env.NODE_ENV    || "production";
process.env.STATIC_PATH = process.env.STATIC_PATH || "public";

// ── 3. Validate critical env vars before starting ────────────────────────────
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SESSION_SECRET"];
const missing  = required.filter(k => !process.env[k] || process.env[k].startsWith("YOUR_"));

if (missing.length > 0) {
  console.error("\n[AI Academy] ERROR: Missing required environment variables:");
  missing.forEach(k => console.error(`  - ${k}`));
  console.error("\nAdd them in Hostinger panel → Node.js → Environment Variables");
  console.error("Then restart the app.\n");
  process.exit(1);
}

// ── 4. Global error guards so the process never dies silently ─────────────────
process.on("uncaughtException", (err) => {
  console.error("[AI Academy] Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[AI Academy] Unhandled promise rejection:", reason);
  process.exit(1);
});

// ── 5. Start the Express application ─────────────────────────────────────────
const PORT = process.env.PORT;
console.log(`[AI Academy] Starting on port ${PORT} (NODE_ENV=${process.env.NODE_ENV})`);

(async () => {
  try {
    // index.mjs is the esbuild-bundled Express server (all deps included)
    await import("./index.mjs");
  } catch (err) {
    console.error("[AI Academy] Failed to start server:", err);
    process.exit(1);
  }
})();
