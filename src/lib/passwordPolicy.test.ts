import crypto from 'node:crypto';
import { describe, expect, test, vi } from 'vitest';
import {
  checkPasswordStrength,
  isPasswordBreached,
  MIN_PASSWORD_LENGTH,
  validatePasswordStrength,
} from './passwordPolicy';

function mockFetch(body: string, ok = true): typeof fetch {
  return vi.fn(async () => ({ ok, text: async () => body })) as unknown as typeof fetch;
}

// The HIBP range endpoint returns the SHA-1 suffix (chars after the first 5).
function hibpSuffix(password: string) {
  return crypto.createHash('sha1').update(password).digest('hex').toUpperCase().slice(5);
}

describe('validatePasswordStrength', () => {
  test('accepts a strong, unique password', () => {
    expect(validatePasswordStrength('Tr0ub4dour-x9q')).toBeNull();
  });

  test('rejects passwords shorter than the minimum', () => {
    expect(validatePasswordStrength('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe(
      'password-too-short',
    );
  });

  test('rejects common passwords (case-insensitive)', () => {
    expect(validatePasswordStrength('Password123')).toBe('password-too-common');
    expect(validatePasswordStrength('ADMINISTRATOR')).toBe('password-too-common');
  });

  test('rejects passwords containing the username', () => {
    expect(validatePasswordStrength('mydaniel-secret', { username: 'daniel' })).toBe(
      'password-contains-username',
    );
  });

  test('ignores very short usernames to avoid false positives', () => {
    expect(validatePasswordStrength('ab-strong-value-1', { username: 'ab' })).toBeNull();
  });
});

describe('isPasswordBreached (HIBP k-anonymity)', () => {
  // SHA-1 of "password" = 5BAA6...; suffix after first 5 chars (public HIBP test
  // vector, not a secret):
  const PASSWORD_SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8'; // gitleaks:allow

  test('detects a breached password from the range response', async () => {
    const fetchImpl = mockFetch(`${PASSWORD_SUFFIX}:99999\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1`);
    expect(await isPasswordBreached('password', fetchImpl)).toBe(true);
  });

  test('returns false when the suffix is absent', async () => {
    const fetchImpl = mockFetch('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1');
    expect(await isPasswordBreached('a-unique-passphrase', fetchImpl)).toBe(false);
  });

  test('fails open on network error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    expect(await isPasswordBreached('password', fetchImpl)).toBe(false);
  });

  test('fails open on non-ok response', async () => {
    expect(await isPasswordBreached('password', mockFetch('', false))).toBe(false);
  });
});

describe('checkPasswordStrength', () => {
  test('offline failure short-circuits before the network call', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    expect(await checkPasswordStrength('short', { fetchImpl })).toBe('password-too-short');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('flags a breached password that passes offline checks', async () => {
    // Strong enough to clear the offline checks, but the mock reports it breached.
    const strong = 'Tr0ub4dour-x9q';
    const fetchImpl = mockFetch(`${hibpSuffix(strong)}:5`);
    expect(await checkPasswordStrength(strong, { fetchImpl })).toBe('password-breached');
  });

  test('returns null for a strong, unbreached password', async () => {
    expect(await checkPasswordStrength('Tr0ub4dour-x9q', { fetchImpl: mockFetch('') })).toBeNull();
  });
});
