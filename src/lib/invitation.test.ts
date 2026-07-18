import { describe, expect, test } from 'vitest';
import {
  generateInviteToken,
  getInviteExpiry,
  hashInviteToken,
  INVITE_TTL_MS,
  isInviteExpired,
} from './invitation';

describe('invite tokens', () => {
  test('generates a URL-safe token and a matching hash', () => {
    const { token, tokenHash } = generateInviteToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // base64url, no +/= padding
    expect(token.length).toBeGreaterThanOrEqual(42); // 32 bytes base64url
    expect(tokenHash).toBe(hashInviteToken(token));
    expect(tokenHash).toHaveLength(128); // sha512 hex
  });

  test('tokens are unique across calls', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateInviteToken().token));
    expect(tokens.size).toBe(100);
  });

  test('different tokens hash to different values', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  test('hashing is deterministic for the same token', () => {
    const { token } = generateInviteToken();
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
  });
});

describe('invite expiry', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  test('expiry is TTL in the future', () => {
    expect(getInviteExpiry(now).getTime()).toBe(now.getTime() + INVITE_TTL_MS);
  });

  test('not expired before the deadline', () => {
    const expiresAt = getInviteExpiry(now);
    const oneMsBefore = new Date(expiresAt.getTime() - 1);
    expect(isInviteExpired(expiresAt, oneMsBefore)).toBe(false);
  });

  test('expired exactly at and after the deadline (boundary)', () => {
    const expiresAt = getInviteExpiry(now);
    expect(isInviteExpired(expiresAt, expiresAt)).toBe(true);
    expect(isInviteExpired(expiresAt, new Date(expiresAt.getTime() + 1))).toBe(true);
  });
});
