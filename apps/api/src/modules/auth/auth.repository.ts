import type { PrismaClient } from '../../database/prisma.js';

/**
 * Database queries for authentication. No business rules live here: this file only
 * knows how to read and write rows.
 */

export function countUsers(prisma: PrismaClient) {
  return prisma.user.count();
}

export function findUserByEmail(prisma: PrismaClient, email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function createUser(
  prisma: PrismaClient,
  data: { email: string; name: string; passwordHash: string; isInstanceAdmin: boolean },
) {
  return prisma.user.create({ data });
}

export function createSession(
  prisma: PrismaClient,
  data: { id: string; userId: string; expiresAt: Date },
) {
  return prisma.session.create({ data });
}

export function findSessionWithUser(prisma: PrismaClient, id: string) {
  return prisma.session.findUnique({ where: { id }, include: { user: true } });
}

/**
 * deleteMany rather than delete: removing a session that is already gone is not an
 * error, which keeps signing out idempotent.
 */
export function deleteSession(prisma: PrismaClient, id: string) {
  return prisma.session.deleteMany({ where: { id } });
}
