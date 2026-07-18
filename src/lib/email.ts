// Provider-agnostic transactional email. The Resend backend is implemented via
// raw fetch (no SDK dependency); swapping to another provider (Postmark, SMTP)
// means replacing `deliver()` only — the rest of the app calls `sendEmail`.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.');
    this.name = 'EmailNotConfiguredError';
  }
}

// Strip CR/LF so no caller-supplied value can inject additional email headers.
function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

// Conservative RFC-5322-ish check; the address is also length-capped upstream.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isValidEmail(email: string) {
  return typeof email === 'string' && email.length <= 255 && EMAIL_RE.test(email);
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Resolve the public base URL used to build links in emails. Prefers an
 * explicit APP_URL, then Vercel's production URL, with no trailing slash.
 */
export function getAppUrl() {
  const url =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '');

  return url.replace(/\/+$/, '');
}

async function deliver(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new EmailNotConfiguredError();
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: sanitizeHeader(from),
      to: [sanitizeHeader(message.to)],
      subject: sanitizeHeader(message.subject),
      html: message.html,
      text: message.text,
    }),
  });

  if (!res.ok) {
    // Surface a provider error without leaking the API key or full response.
    const detail = await res.text().catch(() => '');
    throw new Error(`Email delivery failed (${res.status}): ${detail.slice(0, 200)}`);
  }
}

export async function sendEmail(message: EmailMessage) {
  if (!isValidEmail(message.to)) {
    throw new Error('Invalid recipient email address');
  }

  await deliver({
    to: message.to,
    subject: sanitizeHeader(message.subject),
    html: message.html,
    text: message.text,
  });
}
