import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

type SiteSettings = {
  emailFrom?: string | null;
};

export async function getEmailFromSetting(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "email_from")
      .maybeSingle();

    if (error) {
      console.error("[settings] Failed to read email_from from DB:", error.message);
      return null;
    }

    return data?.value ?? null;
  } catch (err) {
    console.error("[settings] Unexpected error reading email_from:", err);
    return null;
  }
}

async function writeEmailFromSetting(value: string | null): Promise<void> {
  if (value === null) {
    const { error } = await supabase
      .from("site_settings")
      .delete()
      .eq("key", "email_from");

    if (error) {
      throw new Error(`Failed to delete email_from setting: ${error.message}`);
    }
  } else {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "email_from", value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) {
      throw new Error(`Failed to upsert email_from setting: ${error.message}`);
    }
  }
}

// Admin: get email settings
router.get("/settings/email", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const value = await getEmailFromSetting();
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
    await writeEmailFromSetting(valueToStore);
    res.json({ emailFrom: valueToStore });
  } catch (err) {
    console.error("[settings] Failed to write settings to DB:", err);
    res.status(500).json({ error: "Failed to save setting" });
  }
});

export default router;
