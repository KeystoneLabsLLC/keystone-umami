// Keystone-branded transactional email templates. Email clients strip web
// fonts and most CSS, so these use inline styles, a system font stack, and the
// brand palette with green (#9dbe3c) reserved for the single call-to-action —
// per the brand rule "green is signal only, never flooded".

import type { EmailMessage } from '@/lib/email';

const INK = '#0e0e0e';
const MUTED = '#6c6c66';
const PAPER = '#ffffff';
const ALT = '#f4f4f1';
const HAIRLINE = '#ecece4';
const GREEN = '#9dbe3c';
const GREEN_DEEP = '#6f8c24';

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface InviteEmailParams {
  to: string;
  acceptUrl: string;
  inviterName?: string;
  teamName?: string;
  appName?: string;
  expiresInDays?: number;
}

export function inviteEmail(params: InviteEmailParams): EmailMessage {
  const appName = params.appName || 'Keystone Analytics';
  const expiresInDays = params.expiresInDays ?? 7;
  const inviter = params.inviterName ? escapeHtml(params.inviterName) : null;
  const team = params.teamName ? escapeHtml(params.teamName) : null;
  // acceptUrl is a server-built token URL, but escape defensively for HTML context.
  const url = escapeHtml(params.acceptUrl);

  const lead = inviter
    ? `${inviter} has invited you to ${escapeHtml(appName)}.`
    : `You've been invited to ${escapeHtml(appName)}.`;
  const teamLine = team ? ` You'll be added to the <strong>${team}</strong> team.` : '';

  const subject = `You've been invited to ${appName}`;

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:${ALT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ALT};padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:${PAPER};border:1px solid ${HAIRLINE};border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 40px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:28px;height:28px;background:${GREEN};border-radius:6px;"></td>
            <td style="padding-left:10px;font-family:${FONT_STACK};font-size:16px;font-weight:700;color:${INK};letter-spacing:0.02em;">Keystone</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:16px 40px 0;">
          <h1 style="margin:0 0 12px;font-family:${FONT_STACK};font-size:22px;line-height:1.3;color:${INK};font-weight:700;">${lead}</h1>
          <p style="margin:0 0 24px;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${MUTED};">
            Click the button below to set your password and activate your account.${teamLine}
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
            <td style="background:${GREEN};border-radius:8px;">
              <a href="${url}" style="display:inline-block;padding:12px 28px;font-family:${FONT_STACK};font-size:15px;font-weight:700;color:${INK};text-decoration:none;">Set your password</a>
            </td>
          </tr></table>
          <p style="margin:0 0 24px;font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:${MUTED};">
            This invitation expires in ${expiresInDays} days. If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${url}" style="color:${GREEN_DEEP};word-break:break-all;">${url}</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px 32px;border-top:1px solid ${HAIRLINE};">
          <p style="margin:0;font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:${MUTED};">
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const teamTextLine = params.teamName ? ` You'll be added to the ${params.teamName} team.` : '';
  const text = [
    params.inviterName
      ? `${params.inviterName} has invited you to ${appName}.`
      : `You've been invited to ${appName}.`,
    '',
    `Set your password and activate your account:${teamTextLine}`,
    params.acceptUrl,
    '',
    `This invitation expires in ${expiresInDays} days.`,
    `If you weren't expecting this invitation, you can safely ignore this email.`,
  ].join('\n');

  return { to: params.to, subject, html, text };
}
