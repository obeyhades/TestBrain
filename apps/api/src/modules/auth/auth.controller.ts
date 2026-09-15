import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '../../database/prisma.js';
import { getAuthenticatedUser } from '../../middleware/requireAuth.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import {
  createSessionForUser,
  isAwaitingFirstUser,
  loginUser,
  logoutUser,
  registerUser,
} from './auth.service.js';
import { SESSION_COOKIE_NAME } from './sessionCookie.js';

export type AuthDependencies = {
  prisma: PrismaClient;
  cookieOptions: CookieSerializeOptions;
};

/**
 * Registering signs you in as well. The alternative is asking somebody to type the
 * password they just chose a second time, on the very first screen of the product.
 */
export async function registerController(
  deps: AuthDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const input = registerSchema.parse(request.body);

  const user = await registerUser(deps.prisma, input);
  const token = await createSessionForUser(deps.prisma, user, new Date());

  reply.setCookie(SESSION_COOKIE_NAME, token, deps.cookieOptions);

  return reply.status(201).send({ user });
}

export async function loginController(
  deps: AuthDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const input = loginSchema.parse(request.body);

  const { user, token } = await loginUser(deps.prisma, input, new Date());

  reply.setCookie(SESSION_COOKIE_NAME, token, deps.cookieOptions);

  return reply.status(200).send({ user });
}

/**
 * Signing out succeeds whether or not there was a session to end, so a stale tab
 * cannot get stuck on an error it can do nothing about.
 */
export async function logoutController(
  deps: AuthDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const cookie = request.cookies[SESSION_COOKIE_NAME];

  if (cookie !== undefined) {
    const unsigned = request.unsignCookie(cookie);

    if (unsigned.valid && unsigned.value !== null) {
      await logoutUser(deps.prisma, unsigned.value);
    }
  }

  reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

  return reply.status(204).send();
}

/**
 * Public on purpose. It reveals only whether anybody has signed up yet, which a
 * brand new instance has to expose in order to be set up at all.
 */
export async function setupStatusController(
  deps: AuthDependencies,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  return reply.status(200).send({ needsSetup: await isAwaitingFirstUser(deps.prisma) });
}

export async function meController(request: FastifyRequest, reply: FastifyReply) {
  return reply.status(200).send({ user: getAuthenticatedUser(request) });
}
