import { supabase } from "./supabase";
import { logger } from "./logger";

async function tablesExist(): Promise<boolean> {
  const { error } = await supabase.from("users").select("id").limit(1);
  return !error;
}

async function checkRejectionTables(): Promise<void> {
  const { error } = await supabase.from("rejected_enrollments").select("id").limit(1);
  if (error && (error.code === "42P01" || error.message.includes("rejected_enrollments"))) {
    logger.warn(
      "rejected_enrollments table not found — enrollment rejection reasons will not be stored in-app. " +
      "Run the latest SQL in artifacts/api-server/supabase-setup.sql to enable it."
    );
  }
}

export async function initializeDatabase(): Promise<void> {
  logger.info("Checking database connectivity...");

  const exists = await tablesExist();

  if (!exists) {
    const projectRef = (process.env.SUPABASE_URL ?? "")
      .replace("https://", "")
      .split(".")[0];
    const sqlEditorUrl = projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
      : "https://supabase.com/dashboard (open your project > SQL Editor)";
    logger.warn(
      "Database tables not found. Please run the SQL setup script in the Supabase SQL Editor:\n" +
        `  URL: ${sqlEditorUrl}\n` +
        "  File: artifacts/api-server/supabase-setup.sql",
    );
    return;
  }

  await checkRejectionTables();
  logger.info("Database ready ✓");
}
