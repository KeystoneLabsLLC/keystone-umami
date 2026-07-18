import crypto from 'node:crypto';
import { hash } from '@/lib/crypto';

// 32 bytes = 256 bits of entropy, rendered URL-safe for use in the invite link.
export const INVITE_TOKEN_BYTES = 32;

// Invitations are valid for 7 days from creation.
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a single-use invite token. The raw token is emailed to the invitee
 * and never stored; only its hash is persisted, so a leaked database cannot be
 * used to accept invitations.
 */
export function generateInviteToken() {
  const token = crypto.randomBytes(INVITE_TOKEN_BYTES).toString('base64url');

  return { token, tokenHash: hashInviteToken(token) };
}

/**
 * Hash a raw invite token for storage/lookup. The token carries 256 bits of
 * entropy, so a fast one-way hash (sha512, via the shared `hash` helper) is
 * sufficient — bcrypt is only needed for low-entropy secrets like passwords.
 */
export function hashInviteToken(token: string) {
  return hash(token);
}

export function getInviteExpiry(now: Date = new Date()) {
  return new Date(now.getTime() + INVITE_TTL_MS);
}

export function isInviteExpired(expiresAt: Date, now: Date = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}
