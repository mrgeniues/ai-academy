import { createClient } from "@supabase/supabase-js";
import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { sendTestEmail } from "../lib/email";
import {
  DEFAULT_PLATFORM_NAME,
  buildFooterHtml,
} from "../lib/email-templates";
import {
  supabase,
  reinitializeSupabase,
  saveSupabaseConfig,
  getCurrentSupabaseUrl,
  hasRuntimeConfig,
} from "../lib/supabase";

const router: IRouter = Router();

// ── Generic helpers ──────────────────────────────────────────────────────────

async function getSetting(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.error(`[settings] Failed to read ${key} from DB:`, error.message);
      return null;
    }

    return data?.value ?? null;
  } catch (err) {
    console.error(`[settings] Unexpected error reading ${key}:`, err);
    return null;
  }
}

async function writeSetting(key: string, value: string | null): Promise<void> {
  if (value === null) {
    const { error } = await supabase
      .from("site_settings")
      .delete()
      .eq("key", key);

    if (error) {
      throw new Error(`Failed to delete setting ${key}: ${error.message}`);
    }
  } else {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) {
      throw new Error(`Failed to upsert setting ${key}: ${error.message}`);
    }
  }
}

// ── Public helper exported for other routes ──────────────────────────────────

export async function getEmailFromSetting(): Promise<string | null> {
  return getSetting("email_from");
}

export async function getPlatformNameSetting(): Promise<string | null> {
  return getSetting("platform_name");
}

export async function getSupportEmailSetting(): Promise<string | null> {
  return getSetting("support_email");
}

// ── Email settings ───────────────────────────────────────────────────────────

// Admin: get email settings
router.get("/settings/email", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const value = await getSetting("email_from");
  const envDefault = process.env.EMAIL_FROM ?? "LMS Platform <notifications@resend.dev>";

  res.json({
    emailFrom: value ?? null,
    effectiveEmailFrom: value ?? envDefault,
    envDefault,
  });
});

// Admin: save email settings
router.post("/settings/email", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { emailFrom } = req.body as { emailFrom: string | null };
  const valueToStore = emailFrom && emailFrom.trim() ? emailFrom.trim() : null;

  try {
    await writeSetting("email_from", valueToStore);
    res.json({ emailFrom: valueToStore });
  } catch (err) {
    console.error("[settings] Failed to write settings to DB:", err);
    res.status(500).json({ error: "Failed to save setting" });
  }
});

// Admin: preview test email (returns content without sending)
router.get("/settings/email/test/preview", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("email, name")
    .eq("id", req.userId!)
    .single();

  if (userErr || !userRow) {
    res.status(500).json({ error: "Could not look up your account details" });
    return;
  }

  const [fromEmail, platformName, supportEmail] = await Promise.all([
    (async () => {
      try {
        const stored = await getSetting("email_from");
        if (stored) return stored;
      } catch { /* fall through */ }
      return process.env.EMAIL_FROM ?? "LMS Platform <notifications@resend.dev>";
    })(),
    getSetting("platform_name"),
    getSetting("support_email"),
  ]);

  const resolvedPlatformName = platformName ?? DEFAULT_PLATFORM_NAME;
  const name = userRow.name as string;

  const footerHtml = buildFooterHtml(resolvedPlatformName, supportEmail ?? null);

  res.json({
    subject: `Test email from ${resolvedPlatformName}`,
    from: fromEmail,
    to: userRow.email as string,
    html: `
      <p>Hi ${name},</p>
      <p>This is a test email from <strong>${resolvedPlatformName}</strong> to verify that email delivery is working correctly.</p>
      <p>If you received this, your email configuration is set up properly.</p>
      <p><strong>Sending from:</strong> ${fromEmail}</p>
      ${footerHtml}
    `,
  });
});

// Admin: send test email
router.post("/settings/email/test", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("email, name")
    .eq("id", req.userId!)
    .single();

  if (userErr || !userRow) {
    res.status(500).json({ error: "Could not look up your account details" });
    return;
  }

  const result = await sendTestEmail(userRow.email as string, userRow.name as string);

  if (!result.ok) {
    res.status(500).json({ error: result.error ?? "Failed to send test email" });
    return;
  }

  res.json({ message: `Test email sent to ${userRow.email as string}` });
});

// ── General / platform settings ──────────────────────────────────────────────

const VALID_ENROLLMENT_MODES = ["open", "approval_required"] as const;
type EnrollmentMode = (typeof VALID_ENROLLMENT_MODES)[number];

// Admin: get general settings
router.get("/settings/general", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const [platformName, supportEmail, defaultEnrollmentMode] = await Promise.all([
    getSetting("platform_name"),
    getSetting("support_email"),
    getSetting("default_enrollment_mode"),
  ]);

  res.json({
    platformName: platformName ?? null,
    supportEmail: supportEmail ?? null,
    defaultEnrollmentMode: (defaultEnrollmentMode as EnrollmentMode | null) ?? null,
  });
});

// Admin: save general settings
router.post("/settings/general", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const {
    platformName,
    supportEmail,
    defaultEnrollmentMode,
  } = req.body as {
    platformName?: string | null;
    supportEmail?: string | null;
    defaultEnrollmentMode?: string | null;
  };

  if (
    defaultEnrollmentMode !== undefined &&
    defaultEnrollmentMode !== null &&
    !VALID_ENROLLMENT_MODES.includes(defaultEnrollmentMode as EnrollmentMode)
  ) {
    res.status(400).json({ error: "Invalid defaultEnrollmentMode value" });
    return;
  }

  try {
    const writes: Promise<void>[] = [];

    if (platformName !== undefined) {
      writes.push(writeSetting("platform_name", platformName?.trim() || null));
    }
    if (supportEmail !== undefined) {
      writes.push(writeSetting("support_email", supportEmail?.trim() || null));
    }
    if (defaultEnrollmentMode !== undefined) {
      writes.push(writeSetting("default_enrollment_mode", defaultEnrollmentMode ?? null));
    }

    await Promise.all(writes);

    const [savedPlatformName, savedSupportEmail, savedDefaultEnrollmentMode] = await Promise.all([
      getSetting("platform_name"),
      getSetting("support_email"),
      getSetting("default_enrollment_mode"),
    ]);

    res.json({
      platformName: savedPlatformName ?? null,
      supportEmail: savedSupportEmail ?? null,
      defaultEnrollmentMode: (savedDefaultEnrollmentMode as EnrollmentMode | null) ?? null,
    });
  } catch (err) {
    console.error("[settings] Failed to write general settings:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ── Supabase connection settings ─────────────────────────────────────────────

// Public: get current Supabase URL (no secrets exposed — URL only)
router.get("/settings/supabase", async (_req, res): Promise<void> => {
  res.json({
    url: getCurrentSupabaseUrl(),
    hasCustomConfig: hasRuntimeConfig(),
  });
});

// Public: update Supabase credentials
// Security: credentials are validated with a live test query before saving,
// so only a valid Supabase project key will be accepted.
router.post("/settings/supabase", async (req, res): Promise<void> => {

  const { url, serviceRoleKey } = req.body as { url?: string; serviceRoleKey?: string };

  if (!url || !url.trim()) {
    res.status(400).json({ error: "Supabase URL is required" });
    return;
  }
  if (!serviceRoleKey || !serviceRoleKey.trim()) {
    res.status(400).json({ error: "Service Role Key is required" });
    return;
  }

  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanKey = serviceRoleKey.trim();

  // Validate by making a lightweight test query against the new credentials
  try {
    const testClient = createClient(cleanUrl, cleanKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await testClient.from("users").select("id").limit(1);
    if (error && error.code !== "PGRST116") {
      res.status(400).json({ error: `Connection test failed: ${error.message}` });
      return;
    }
  } catch (e) {
    res.status(400).json({ error: `Could not connect: ${(e as Error).message}` });
    return;
  }

  saveSupabaseConfig(cleanUrl, cleanKey);
  reinitializeSupabase(cleanUrl, cleanKey);

  res.json({ success: true, url: cleanUrl });
});

export default router;
