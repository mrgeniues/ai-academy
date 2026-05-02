export interface PlatformSettings {
  platformName: string;
  supportEmail: string | null;
}

export const DEFAULT_PLATFORM_NAME = "LMS Platform";

export function buildFooterHtml(platformName: string, supportEmail: string | null): string {
  const contact = supportEmail
    ? `<p style="color:#6b7280;font-size:13px;">Need help? Contact us at <a href="mailto:${supportEmail}" style="color:#6d28d9;">${supportEmail}</a>.</p>`
    : "";
  return `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    ${contact}
    <p style="color:#9ca3af;font-size:12px;">&copy; ${platformName}</p>
  `;
}

export function buildFooterText(platformName: string, supportEmail: string | null): string {
  const contact = supportEmail ? `\nNeed help? Contact us at ${supportEmail}.` : "";
  return `\n\n---\n${platformName}${contact}`;
}

export function buildContactLineHtml(supportEmail: string | null): string {
  return supportEmail
    ? `If you believe this is a mistake, please contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.`
    : "If you believe this is a mistake, please contact the platform administrator for more information.";
}

export function buildContactLineText(supportEmail: string | null): string {
  return supportEmail
    ? `If you believe this is a mistake, please contact us at ${supportEmail}.`
    : "If you believe this is a mistake, please contact the platform administrator for more information.";
}
