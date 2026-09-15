import type { PrismaClient } from '../../src/database/prisma.js';
import type { ProjectRole } from '../../src/generated/prisma/enums.js';
import { hashPassword } from '../../src/modules/auth/password.js';
import type { AuthenticatedUser } from '../../src/modules/auth/auth.service.js';

/**
 * Test data built straight through the repository layer.
 *
 * Going through the services would make every test depend on the rules of whatever
 * it is not testing, so arranging state is deliberately kept separate from
 * exercising behaviour.
 */
export async function createTestUser(
  prisma: PrismaClient,
  overrides: { email?: string; name?: string; isInstanceAdmin?: boolean } = {},
): Promise<AuthenticatedUser> {
  const email = overrides.email ?? `user-${Math.random().toString(36).slice(2, 10)}@example.com`;

  const user = await prisma.user.create({
    data: {
      email,
      name: overrides.name ?? 'Test User',
      passwordHash: await hashPassword('a-long-enough-passphrase'),
      isInstanceAdmin: overrides.isInstanceAdmin ?? false,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isInstanceAdmin: user.isInstanceAdmin,
  };
}

export async function createTestProject(
  prisma: PrismaClient,
  owner: AuthenticatedUser,
  name = 'Test Project',
): Promise<{ id: string; name: string }> {
  const project = await prisma.project.create({
    data: {
      name,
      createdById: owner.id,
      members: { create: { userId: owner.id, role: 'ADMIN' } },
    },
  });

  return { id: project.id, name: project.name };
}

export async function addTestMember(
  prisma: PrismaClient,
  projectId: string,
  user: AuthenticatedUser,
  role: ProjectRole,
): Promise<void> {
  await prisma.projectMember.create({ data: { projectId, userId: user.id, role } });
}
