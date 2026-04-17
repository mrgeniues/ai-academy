import { Resend } from "resend";
import { getEmailFromSetting } from "../routes/settings";

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
  return process.env.EMAIL_FROM ?? "LMS Platform <notifications@resend.dev>";
}

export async function sendUserApprovedEmail(to: string, name: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  const fromEmail = await resolveFromEmail();

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: "Your account has been approved",
      html: `
        <p>Hi ${name},</p>
        <p>Great news — your account has been approved! You can now log in and access the platform.</p>
        <p>Welcome aboard!</p>
      `,
      text: `Hi ${name},\n\nGreat news — your account has been approved! You can now log in and access the platform.\n\nWelcome aboard!`,
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

  const fromEmail = await resolveFromEmail();

  const reasonHtml = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : "";
  const reasonText = reason ? `\n\nReason: ${reason}` : "";

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: "Your account application was not approved",
      html: `
        <p>Hi ${name},</p>
        <p>Unfortunately, your account application has not been approved at this time.</p>
        ${reasonHtml}
        <p>If you believe this is a mistake, please contact the platform administrator for more information.</p>
      `,
      text: `Hi ${name},\n\nUnfortunately, your account application has not been approved at this time.${reasonText}\n\nIf you believe this is a mistake, please contact the platform administrator for more information.`,
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

  const fromEmail = await resolveFromEmail();

  const reasonHtml = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : "";
  const reasonText = reason ? `\n\nReason: ${reason}` : "";

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: `Your enrollment request for ${courseName} was not approved`,
      html: `
        <p>Hi ${name},</p>
        <p>Unfortunately, your enrollment request for <strong>${courseName}</strong> has not been approved at this time.</p>
        ${reasonHtml}
        <p>If you believe this is a mistake, please contact the platform administrator for more information.</p>
      `,
      text: `Hi ${name},\n\nUnfortunately, your enrollment request for "${courseName}" has not been approved at this time.${reasonText}\n\nIf you believe this is a mistake, please contact the platform administrator for more information.`,
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

  const fromEmail = resolveFromEmail();

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: "Test email from LMS Platform",
      html: `
        <p>Hi ${name},</p>
        <p>This is a test email from your LMS Platform to verify that email delivery is working correctly.</p>
        <p>If you received this, your email configuration is set up properly.</p>
        <p><strong>Sending from:</strong> ${fromEmail}</p>
      `,
      text: `Hi ${name},\n\nThis is a test email from your LMS Platform to verify that email delivery is working correctly.\n\nIf you received this, your email configuration is set up properly.\n\nSending from: ${fromEmail}`,
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

export async function sendEnrollmentApprovedEmail(
  to: string,
  name: string,
  courseName: string
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const fromEmail = await resolveFromEmail();

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: `You've been approved for ${courseName}`,
      html: `
        <p>Hi ${name},</p>
        <p>Your enrollment request for <strong>${courseName}</strong> has been approved. You can now access the course.</p>
        <p>Happy learning!</p>
      `,
      text: `Hi ${name},\n\nYour enrollment request for "${courseName}" has been approved. You can now access the course.\n\nHappy learning!`,
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
