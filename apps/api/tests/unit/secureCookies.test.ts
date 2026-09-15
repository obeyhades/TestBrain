import { describe, expect, it } from 'vitest';
import { buildSessionCookieOptions } from '../../src/modules/auth/sessionCookie.js';

/**
 * The rule index.ts applies when it builds the server. Written out here so the
 * reasoning is covered even though the decision itself is one expression.
 */
function secureCookiesFor(appUrl: string): boolean {
  return appUrl.startsWith('https://');
}

describe('when the session cookie is marked Secure', () => {
  it('is marked Secure when the app is served over HTTPS', () => {
    expect(secureCookiesFor('https://testbrain.example.com')).toBe(true);
  });

  it('is not marked Secure on plain HTTP, which self-hosting on a LAN uses', () => {
    // A Secure cookie is never sent over http://, so marking it here would mean
    // signing in appears to work and then does nothing.
    expect(secureCookiesFor('http://192.168.1.5:3000')).toBe(false);
    expect(secureCookiesFor('http://localhost:3000')).toBe(false);
  });
});

describe('buildSessionCookieOptions', () => {
  it('always locks the cookie away from page JavaScript and cross-site requests', () => {
    for (const secure of [true, false]) {
      const options = buildSessionCookieOptions(secure);

      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.signed).toBe(true);
      expect(options.path).toBe('/');
    }
  });

  it('passes the secure flag through', () => {
    expect(buildSessionCookieOptions(true).secure).toBe(true);
    expect(buildSessionCookieOptions(false).secure).toBe(false);
  });
});
