/**
 * AI Academy 2.0 — Hostinger entry point
 *
 * Hostinger Node.js hosting runs: node server.js
 * This file is CommonJS and loads the ESM bundle via dynamic import.
 *
 * Environment variables required (set in Hostinger panel):
 *   PORT                    — provided automatically by Hostinger (default 3000)
 *   NODE_ENV                — set to "production"
 *   STATIC_PATH             — set to "public"
 *   SUPABASE_URL            — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — your Supabase service role key (secret)
 *   SESSION_SECRET          — any long random string for JWT signing
 */

// Hostinger sets PORT automatically; fall back to 3000 if not provided
process.env.PORT = process.env.PORT || "3000";
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.STATIC_PATH = process.env.STATIC_PATH || "public";

(async () => {
  try {
    // The bundled Express app (ESM, built by esbuild)
    await import("./index.mjs");
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
