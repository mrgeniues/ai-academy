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

export async function sendUserRejectedEmail(to: string, name: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  const fromEmail = await resolveFromEmail();

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: "Your account application was not approved",
      html: `
        <p>Hi ${name},</p>
        <p>Unfortunately, your account application has not been approved at this time.</p>
        <p>If you believe this is a mistake, please contact the platform administrator for more information.</p>
      `,
      text: `Hi ${name},\n\nUnfortunately, your account application has not been approved at this time.\n\nIf you believe this is a mistake, please contact the platform administrator for more information.`,
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
  courseName: string
): Promise<void> {
  const client = getClient();
  if (!client) return;

  const fromEmail = await resolveFromEmail();

  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: `Your enrollment request for ${courseName} was not approved`,
      html: `
        <p>Hi ${name},</p>
        <p>Unfortunately, your enrollment request for <strong>${courseName}</strong> has not been approved at this time.</p>
        <p>If you believe this is a mistake, please contact the platform administrator for more information.</p>
      `,
      text: `Hi ${name},\n\nUnfortunately, your enrollment request for "${courseName}" has not been approved at this time.\n\nIf you believe this is a mistake, please contact the platform administrator for more information.`,
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
