import type { CookieSerializeOptions } from '@fastify/cookie';
import { SESSION_DURATION_MS } from './sessionToken.js';

export const SESSION_COOKIE_NAME = 'testbrain_session';

/**
 * How the session cookie is written. Every flag here is a deliberate restriction:
 *
 * - httpOnly  : page JavaScript cannot read it, so an XSS bug cannot steal the session
 * - sameSite  : the browser does not attach it to cross-site requests, blocking basic CSRF
 * - secure    : HTTPS only, switched off in development where there is no certificate
 * - signed    : a tampered value is rejected before the database is ever queried
 */
export function buildSessionCookieOptions(secure: boolean): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    signed: true,
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  };
}
