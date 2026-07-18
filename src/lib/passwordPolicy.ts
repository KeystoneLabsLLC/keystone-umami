import crypto from 'node:crypto';

// Minimum length for any newly-set password. Higher than the legacy 8 to
// meaningfully raise brute-force cost.
export const MIN_PASSWORD_LENGTH = 10;

// Small blocklist of the most-abused passwords for instant, offline feedback.
// The breached-password check below catches the long tail; this list also
// covers the case where that external service is unavailable.
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwertyuiop',
  'qwerty123',
  'letmein',
  'welcome',
  'welcome1',
  'admin',
  'admin123',
  'administrator',
  'iloveyou',
  'monkey',
  'dragon',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'abc12345',
  'passw0rd',
  'p@ssw0rd',
  'changeme',
  'trustno1',
  'whatever',
  'umami',
  'keystone',
  'keystone1',
  'analytics',
  'default',
  'secret',
]);

export type PasswordStrengthCode =
  | 'password-too-short'
  | 'password-too-common'
  | 'password-contains-username'
  | 'password-breached';

/**
 * Synchronous, offline strength checks. Returns a failure code or null.
 */
export function validatePasswordStrength(
  password: string,
  options: { username?: string } = {},
): PasswordStrengthCode | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return 'password-too-short';
  }

  const lower = password.toLowerCase();
  const username = options.username?.trim().toLowerCase();

  // Block passwords that embed the username (only for usernames long enough to
  // be meaningful, to avoid false positives on 1-2 char names).
  if (username && username.length >= 3 && lower.includes(username)) {
    return 'password-contains-username';
  }

  if (COMMON_PASSWORDS.has(lower)) {
    return 'password-too-common';
  }

  return null;
}

/**
 * Check the password against Have I Been Pwned using k-anonymity: only the
 * first 5 chars of its SHA-1 hash are ever sent, never the password. Fails
 * OPEN (returns false) on any network/timeout error so an outage can't block
 * account setup. The fetch is injectable for offline testing.
 */
export async function isPasswordBreached(
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const res = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return false;
    }

    const body = await res.text();

    return body.split('\n').some(line => line.split(':')[0]?.trim().toUpperCase() === suffix);
  } catch {
    return false; // fail open
  }
}

/**
 * Full policy: offline checks first, then the breached-password lookup.
 * Returns a failure code or null.
 */
export async function checkPasswordStrength(
  password: string,
  options: { username?: string; fetchImpl?: typeof fetch } = {},
): Promise<PasswordStrengthCode | null> {
  const local = validatePasswordStrength(password, { username: options.username });

  if (local) {
    return local;
  }

  if (await isPasswordBreached(password, options.fetchImpl)) {
    return 'password-breached';
  }

  return null;
}
