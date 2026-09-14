import { createHash, randomBytes } from 'node:crypto';

/** 32 bytes is 256 bits of entropy: far beyond guessing range. */
const TOKEN_BYTES = 32;

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Creates the value that goes into the user's cookie. This is the only form of the
 * token that can be used to authenticate, and it is never written to the database.
 */
export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Sessions are stored under the SHA-256 hash of their token, so a leaked database
 * dump contains nothing an attacker could present as a cookie.
 *
 * SHA-256 rather than Argon2 on purpose. Argon2 is deliberately slow to make weak,
 * guessable passwords expensive to attack. A session token is 256 random bits and
 * cannot be guessed, so there is nothing to slow down -- and unlike a password hash,
 * this runs on every single authenticated request.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function calculateSessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_DURATION_MS);
}

export function isSessionExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}
