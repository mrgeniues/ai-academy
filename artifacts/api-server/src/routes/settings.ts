import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import fs from "node:fs";
import path from "node:path";

const router: IRouter = Router();

const SETTINGS_FILE = path.resolve(process.cwd(), "data", "settings.json");

type SiteSettings = {
  emailFrom?: string | null;
};

function readSettings(): SiteSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return {};
    const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
    return JSON.parse(raw) as SiteSettings;
  } catch {
    return {};
  }
}

function writeSettings(settings: SiteSettings): void {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}

export function getEmailFromSetting(): string | null {
  const settings = readSettings();
  return settings.emailFrom ?? null;
}

// Admin: get email settings
router.get("/settings/email", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const value = getEmailFromSetting();
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
    const current = readSettings();
    writeSettings({ ...current, emailFrom: valueToStore });
    res.json({ emailFrom: valueToStore });
  } catch (err) {
    console.error("[settings] Failed to write settings file:", err);
    res.status(500).json({ error: "Failed to save setting" });
  }
});

export default router;
