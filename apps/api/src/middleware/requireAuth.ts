import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import type { PrismaClient } from '../database/prisma.js';
import { UnauthorizedError } from '../shared/errors.js';
import { getUserForSessionToken, type AuthenticatedUser } from '../modules/auth/auth.service.js';
import { SESSION_COOKIE_NAME } from '../modules/auth/sessionCookie.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/**
 * Rejects the request unless it carries a valid session cookie, and attaches the
 * user it belongs to.
 */
export function createRequireAuth(prisma: PrismaClient): preHandlerAsyncHookHandler {
  return async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
    const cookie = request.cookies[SESSION_COOKIE_NAME];

    if (cookie === undefined) {
      throw new UnauthorizedError();
    }

    // A forged or edited cookie fails here, so it never reaches the database.
    const unsigned = request.unsignCookie(cookie);

    if (!unsigned.valid || unsigned.value === null) {
      throw new UnauthorizedError();
    }

    const user = await getUserForSessionToken(prisma, unsigned.value, new Date());

    if (user === null) {
      throw new UnauthorizedError();
    }

    request.user = user;
  };
}

/**
 * Reads the user that createRequireAuth attached.
 *
 * The throw is unreachable on a route that uses requireAuth; it exists so that
 * controllers get a plain AuthenticatedUser instead of one that might be undefined.
 */
export function getAuthenticatedUser(request: FastifyRequest): AuthenticatedUser {
  if (request.user === undefined) {
    throw new UnauthorizedError();
  }

  return request.user;
}
