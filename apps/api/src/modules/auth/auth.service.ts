import type { PrismaClient } from '../../database/prisma.js';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors.js';
import * as authRepository from './auth.repository.js';
import { hashPassword, verifyPassword } from './password.js';
import {
  calculateSessionExpiry,
  generateSessionToken,
  hashSessionToken,
  isSessionExpired,
} from './sessionToken.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

/**
 * What the rest of the application is allowed to see about a signed-in user.
 * Building this explicitly is how passwordHash stays out of API responses and logs.
 */
export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  isInstanceAdmin: boolean;
};

function toAuthenticatedUser(user: AuthenticatedUser): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isInstanceAdmin: user.isInstanceAdmin,
  };
}

/**
 * Addresses are compared and stored in one form, so Owner@Example.com and
 * owner@example.com are the same account rather than two.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Starts a session and returns the token that belongs in the user's cookie.
 *
 * Signing in and registering both need this, and registering must not have to
 * re-verify a password it just hashed.
 */
export async function createSessionForUser(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  now: Date,
): Promise<string> {
  const token = generateSessionToken();

  await authRepository.createSession(prisma, {
    id: hashSessionToken(token),
    userId: user.id,
    expiresAt: calculateSessionExpiry(now),
  });

  return token;
}

/**
 * Whether this instance is still waiting for its first account.
 *
 * The sign-in screen asks this so a brand new instance can send the very first
 * visitor to the registration form instead of a login form nobody can use yet.
 */
export async function isAwaitingFirstUser(prisma: PrismaClient): Promise<boolean> {
  return (await authRepository.countUsers(prisma)) === 0;
}

/**
 * Creates the account that owns this instance.
 *
 * Registration is open only until somebody takes it. After that an administrator
 * creates accounts, which arrives with project members.
 */
export async function registerUser(
  prisma: PrismaClient,
  input: RegisterInput,
): Promise<AuthenticatedUser> {
  // Two people registering in the same instant could both pass this check. On a
  // self-hosted instance being set up by its owner that is not worth a lock.
  if ((await authRepository.countUsers(prisma)) > 0) {
    throw new ForbiddenError('Registration is closed. Ask an administrator for an account.');
  }

  const user = await authRepository.createUser(prisma, {
    email: normalizeEmail(input.email),
    name: input.name,
    passwordHash: await hashPassword(input.password),
    isInstanceAdmin: true,
  });

  return toAuthenticatedUser(user);
}

export async function loginUser(
  prisma: PrismaClient,
  input: LoginInput,
  now: Date,
): Promise<{ user: AuthenticatedUser; token: string }> {
  const user = await authRepository.findUserByEmail(prisma, normalizeEmail(input.email));

  // An unknown address and a wrong password give the same answer, so the response
  // cannot be used to find out which email addresses have accounts here.
  if (user === null || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const authenticatedUser = toAuthenticatedUser(user);

  return {
    user: authenticatedUser,
    token: await createSessionForUser(prisma, authenticatedUser, now),
  };
}

export async function logoutUser(prisma: PrismaClient, token: string): Promise<void> {
  await authRepository.deleteSession(prisma, hashSessionToken(token));
}

/**
 * Resolves a cookie token to the user it belongs to, or null if it is unknown or
 * out of date. This is what protects every authenticated endpoint.
 */
export async function getUserForSessionToken(
  prisma: PrismaClient,
  token: string,
  now: Date,
): Promise<AuthenticatedUser | null> {
  const session = await authRepository.findSessionWithUser(prisma, hashSessionToken(token));

  if (session === null) {
    return null;
  }

  if (isSessionExpired(session.expiresAt, now)) {
    // Clear it out on the way past, so expired rows do not need a scheduled job.
    await authRepository.deleteSession(prisma, session.id);
    return null;
  }

  return toAuthenticatedUser(session.user);
}
