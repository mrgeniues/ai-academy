import { Resend } from "resend";
import { getEmailFromSetting, getPlatformNameSetting, getSupportEmailSetting } from "../routes/settings";
import {
  DEFAULT_PLATFORM_NAME,
  buildFooterHtml,
  buildFooterText,
  buildContactLineHtml,
  buildContactLineText,
  type PlatformSettings,
} from "./email-templates";

const apiKey = process.env.RESEND_API_KEY;

let resendClient: Resend | null = null;
let missingKeyWarned = false;

function getClient(): Resend | null {
  if (!apiKey) {
    if (!missingKeyWarned) {
      console.warn("[email] RESEND_API_KEY is not set — email notifications are disabled");
      missingKeyWarned = true;
    }
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

async function resolveFromEmail(): Promise<string> {
  try {
    const stored = await getEmailFromSetting();
    if (stored) return stored;
  } catch {
    // fall through to env / default
  }
  return process.env.EMAIL_FROM ?? `${DEFAULT_PLATFORM_NAME} <notifications@resend.dev>`;
}

async function resolvePlatformSettings(): Promise<PlatformSettings> {
  try {
    const [platformName, supportEmail] = await Promise.all([
      getPlatformNameSetting(),
      getSupportEmailSetting(),
    ]);
    return {
      platformName: platformName ?? DEFAULT_PLATFORM_NAME,
      supportEmail: supportEmail ?? null,
    };
  } catch {
    return { platformName: DEFAULT_PLATFORM_NAME, supportEmail: null };
  }
}

export async function sendUserApprovedEmail(to: string, name: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  const [fromEmail, { platformName, supportEmail }] = await Promise.all([
    resolveFromEmail(),
    resolvePlatformSettings(),
  ]);

  const footerHtml = buildFooterHtml(platformName, supportEmail);
  const footerText = buildFooterText(platformName, supportEmail);

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: `Your ${platformName} account has been approved`,
      html: `
        <p>Hi ${name},</p>
        <p>Great news — your account has been approved! You can now log in and access the platform.</p>
        <p>Welcome aboard!</p>
        ${footerHtml}
      `,
      text: `Hi ${name},\n\nGreat news — your account has been approved! You can now log in and access the platform.\n\nWelcome aboard!${footerText}`,
    });

    if (error) {
      console.error("[email] Failed to send user approved email:", error);
    } else {
      console.info(`[email] Sent user approved email to ${to}`);
    }
  } catch (err) {
    console.error("[email] Unexpected error sending user approved email:", err);
  }
}

export async function sendUserRejectedEmail(to: string, name: string, reason?: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  const [fromEmail, { platformName, supportEmail }] = await Promise.all([
    resolveFromEmail(),
    resolvePlatformSettings(),
  ]);

  const reasonHtml = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : "";
  const reasonText = reason ? `\n\nReason: ${reason}` : "";
  const footerHtml = buildFooterHtml(platformName, supportEmail);
  const footerText = buildFooterText(platformName, supportEmail);

  const contactLine = supportEmail
    ? `If you believe this is a mistake, please contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.`
    : "If you believe this is a mistake, please contact the platform administrator for more information.";
  const contactLineText = supportEmail
    ? `If you believe this is a mistake, please contact us at ${supportEmail}.`
    : "If you believe this is a mistake, please contact the platform administrator for more information.";

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: `Your ${platformName} account application was not approved`,
      html: `
        <p>Hi ${name},</p>
        <p>Unfortunately, your account application has not been approved at this time.</p>
        ${reasonHtml}
        <p>${contactLine}</p>
        ${footerHtml}
      `,
      text: `Hi ${name},\n\nUnfortunately, your account application has not been approved at this time.${reasonText}\n\n${contactLineText}${footerText}`,
    });

    if (error) {
      console.error("[email] Failed to send user rejected email:", error);
    } else {
      console.info(`[email] Sent user rejected email to ${to}`);
    }
  } catch (err) {
    console.error("[email] Unexpected error sending user rejected email:", err);
  }
}

export async function sendEnrollmentRejectedEmail(
  to: string,
  name: string,
  courseName: string,
  reason?: string
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const [fromEmail, { platformName, supportEmail }] = await Promise.all([
    resolveFromEmail(),
    resolvePlatformSettings(),
  ]);

  const reasonHtml = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : "";
  const reasonText = reason ? `\n\nReason: ${reason}` : "";
  const footerHtml = buildFooterHtml(platformName, supportEmail);
  const footerText = buildFooterText(platformName, supportEmail);

  const contactLine = supportEmail
    ? `If you believe this is a mistake, please contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.`
    : "If you believe this is a mistake, please contact the platform administrator for more information.";
  const contactLineText = supportEmail
    ? `If you believe this is a mistake, please contact us at ${supportEmail}.`
    : "If you believe this is a mistake, please contact the platform administrator for more information.";

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: `Your enrollment request for ${courseName} was not approved`,
      html: `
        <p>Hi ${name},</p>
        <p>Unfortunately, your enrollment request for <strong>${courseName}</strong> has not been approved at this time.</p>
        ${reasonHtml}
        <p>${contactLine}</p>
        ${footerHtml}
      `,
      text: `Hi ${name},\n\nUnfortunately, your enrollment request for "${courseName}" has not been approved at this time.${reasonText}\n\n${contactLineText}${footerText}`,
    });

    if (error) {
      console.error("[email] Failed to send enrollment rejected email:", error);
    } else {
      console.info(`[email] Sent enrollment rejected email to ${to} for course "${courseName}"`);
    }
  } catch (err) {
    console.error("[email] Unexpected error sending enrollment rejected email:", err);
  }
}

export async function sendTestEmail(to: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "Email is not configured — RESEND_API_KEY is missing." };
  }

  const [fromEmail, { platformName, supportEmail }] = await Promise.all([
    resolveFromEmail(),
    resolvePlatformSettings(),
  ]);

  const footerHtml = buildFooterHtml(platformName, supportEmail);
  const footerText = buildFooterText(platformName, supportEmail);

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: `Test email from ${platformName}`,
      html: `
        <p>Hi ${name},</p>
        <p>This is a test email from <strong>${platformName}</strong> to verify that email delivery is working correctly.</p>
        <p>If you received this, your email configuration is set up properly.</p>
        <p><strong>Sending from:</strong> ${fromEmail}</p>
        ${footerHtml}
      `,
      text: `Hi ${name},\n\nThis is a test email from ${platformName} to verify that email delivery is working correctly.\n\nIf you received this, your email configuration is set up properly.\n\nSending from: ${fromEmail}${footerText}`,
    });

    if (error) {
      console.error("[email] Failed to send test email:", error);
      return { ok: false, error: error.message ?? "Failed to send test email" };
    }

    console.info(`[email] Sent test email to ${to}`);
    return { ok: true };
  } catch (err) {
    console.error("[email] Unexpected error sending test email:", err);
    return { ok: false, error: (err as Error).message ?? "Unexpected error" };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[email] Password reset email skipped — RESEND_API_KEY not set");
    return;
  }

  const [fromEmail, { platformName, supportEmail }] = await Promise.all([
    resolveFromEmail(),
    resolvePlatformSettings(),
  ]);

  const baseUrl = process.env.SITE_URL ?? "https://aiacadmy.online";
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const footerHtml = buildFooterHtml(platformName, supportEmail);
  const footerText = buildFooterText(platformName, supportEmail);

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: `Reset your ${platformName} password`,
      html: `
        <p>Hi ${name},</p>
        <p>We received a request to reset your password for <strong>${platformName}</strong>. Click the link below to choose a new one:</p>
        <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#6d28d9;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a></p>
        <p>Or copy this link into your browser:<br><a href="${resetLink}">${resetLink}</a></p>
        <p>This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
        ${footerHtml}
      `,
      text: `Hi ${name},\n\nWe received a request to reset your password for ${platformName}.\n\nReset link (expires in 1 hour):\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.${footerText}`,
    });

    if (error) {
      console.error("[email] Failed to send password reset email:", error);
    } else {
      console.info(`[email] Sent password reset email to ${to}`);
    }
  } catch (err) {
    console.error("[email] Unexpected error sending password reset email:", err);
  }
}

export async function sendEnrollmentApprovedEmail(
  to: string,
  name: string,
  courseName: string
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const [fromEmail, { platformName, supportEmail }] = await Promise.all([
    resolveFromEmail(),
    resolvePlatformSettings(),
  ]);

  const footerHtml = buildFooterHtml(platformName, supportEmail);
  const footerText = buildFooterText(platformName, supportEmail);

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: `You've been approved for ${courseName}`,
      html: `
        <p>Hi ${name},</p>
        <p>Your enrollment request for <strong>${courseName}</strong> has been approved. You can now access the course.</p>
        <p>Happy learning!</p>
        ${footerHtml}
      `,
      text: `Hi ${name},\n\nYour enrollment request for "${courseName}" has been approved. You can now access the course.\n\nHappy learning!${footerText}`,
    });

    if (error) {
      console.error("[email] Failed to send enrollment approved email:", error);
    } else {
      console.info(`[email] Sent enrollment approved email to ${to} for course "${courseName}"`);
    }
  } catch (err) {
    console.error("[email] Unexpected error sending enrollment approved email:", err);
  }
}
