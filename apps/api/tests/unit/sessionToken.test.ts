import { describe, expect, it } from 'vitest';
import {
  SESSION_DURATION_MS,
  calculateSessionExpiry,
  generateSessionToken,
  hashSessionToken,
  isSessionExpired,
} from '../../src/modules/auth/sessionToken.js';

describe('generateSessionToken', () => {
  it('carries 32 bytes of randomness', () => {
    expect(Buffer.from(generateSessionToken(), 'base64url')).toHaveLength(32);
  });

  it('never repeats itself', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSessionToken()));

    expect(tokens.size).toBe(100);
  });
});

describe('hashSessionToken', () => {
  it('gives the same hash for the same token, so a session can be looked up', () => {
    const token = generateSessionToken();

    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it('gives different hashes for different tokens', () => {
    expect(hashSessionToken(generateSessionToken())).not.toBe(
      hashSessionToken(generateSessionToken()),
    );
  });

  it('does not reveal the token, which is what makes a database dump useless', () => {
    const token = generateSessionToken();
    const hashed = hashSessionToken(token);

    expect(hashed).not.toBe(token);
    expect(hashed).not.toContain(token);
  });
});

describe('calculateSessionExpiry', () => {
  it('expires a session seven days after it was created', () => {
    const createdAt = new Date('2026-01-01T12:00:00.000Z');

    expect(calculateSessionExpiry(createdAt)).toEqual(new Date('2026-01-08T12:00:00.000Z'));
    expect(SESSION_DURATION_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('isSessionExpired', () => {
  const expiresAt = new Date('2026-01-08T12:00:00.000Z');

  it('is not expired one second before the deadline', () => {
    expect(isSessionExpired(expiresAt, new Date('2026-01-08T11:59:59.000Z'))).toBe(false);
  });

  it('is expired exactly at the deadline', () => {
    expect(isSessionExpired(expiresAt, new Date('2026-01-08T12:00:00.000Z'))).toBe(true);
  });

  it('is expired after the deadline', () => {
    expect(isSessionExpired(expiresAt, new Date('2026-01-08T12:00:01.000Z'))).toBe(true);
  });
});
