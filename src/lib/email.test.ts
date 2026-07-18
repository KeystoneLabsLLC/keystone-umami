import { afterEach, describe, expect, test } from 'vitest';
import { getAppUrl, isValidEmail } from './email';
import { inviteEmail } from './emailTemplates';

describe('isValidEmail', () => {
  test.each([
    'user@keystonelab.net',
    'first.last@sub.example.co.uk',
    'a@b.io',
  ])('accepts %s', email => {
    expect(isValidEmail(email)).toBe(true);
  });

  test.each([
    ['missing @', 'no-at-sign.com'],
    ['no domain dot', 'user@localhost'],
    ['leading space', ' user@example.com'],
    ['internal space', 'us er@example.com'],
    ['header injection (CRLF)', 'user@example.com\r\nBcc: victim@evil.com'],
    ['newline injection', 'user@example.com\nBcc: victim@evil.com'],
    ['empty', ''],
  ])('rejects %s', (_label, email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  test('rejects addresses longer than 255 chars', () => {
    const long = `${'a'.repeat(250)}@example.com`;
    expect(isValidEmail(long)).toBe(false);
  });
});

describe('getAppUrl', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  test('strips trailing slashes from APP_URL', () => {
    process.env.APP_URL = 'https://analytics.keystonelab.net/';
    expect(getAppUrl()).toBe('https://analytics.keystonelab.net');
  });

  test('falls back to Vercel production URL', () => {
    delete process.env.APP_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'analytics.keystonelab.net';
    expect(getAppUrl()).toBe('https://analytics.keystonelab.net');
  });
});

describe('inviteEmail template', () => {
  test('includes the accept URL, subject, and plain-text alternative', () => {
    const msg = inviteEmail({
      to: 'user@keystonelab.net',
      acceptUrl: 'https://analytics.keystonelab.net/invite/abc123',
      inviterName: 'daniel',
    });

    expect(msg.to).toBe('user@keystonelab.net');
    expect(msg.subject).toContain('Keystone Analytics');
    expect(msg.html).toContain('https://analytics.keystonelab.net/invite/abc123');
    expect(msg.text).toContain('https://analytics.keystonelab.net/invite/abc123');
  });

  test('escapes HTML in inviter and team names (XSS guard)', () => {
    const msg = inviteEmail({
      to: 'user@keystonelab.net',
      acceptUrl: 'https://analytics.keystonelab.net/invite/abc',
      inviterName: '<script>alert(1)</script>',
      teamName: '<img src=x onerror=alert(2)>',
    });

    expect(msg.html).not.toContain('<script>');
    expect(msg.html).not.toContain('<img src=x');
    expect(msg.html).toContain('&lt;script&gt;');
  });
});
