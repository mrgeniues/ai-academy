import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CONFIG_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.supabase-runtime.json",
);

interface SupabaseRuntimeConfig {
  url: string;
  serviceRoleKey: string;
}

function loadRuntimeConfig(): SupabaseRuntimeConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) as SupabaseRuntimeConfig;
    }
  } catch {
    // ignore
  }
  return null;
}

const runtimeCfg = loadRuntimeConfig();
const initialUrl = runtimeCfg?.url ?? process.env.SUPABASE_URL ?? "";
const initialKey = runtimeCfg?.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!initialUrl) throw new Error("SUPABASE_URL is required");
if (!initialKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

let _client: SupabaseClient = createClient(initialUrl, initialKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (_client as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function reinitializeSupabase(url: string, serviceRoleKey: string): void {
  _client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function saveSupabaseConfig(url: string, serviceRoleKey: string): void {
  const cfg: SupabaseRuntimeConfig = { url, serviceRoleKey };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg), "utf-8");
}

export function getCurrentSupabaseUrl(): string {
  const cfg = loadRuntimeConfig();
  return cfg?.url ?? process.env.SUPABASE_URL ?? "";
}

export function hasRuntimeConfig(): boolean {
  return loadRuntimeConfig() !== null;
}
