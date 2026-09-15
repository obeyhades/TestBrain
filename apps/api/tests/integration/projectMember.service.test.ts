import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPrismaClient, resetDatabase } from '../helpers/testDatabase.js';
import { addTestMember, createTestProject, createTestUser } from '../helpers/fixtures.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../src/shared/errors.js';
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  updateProjectMemberRole,
} from '../../src/modules/projects/projectMember.service.js';

const prisma = createTestPrismaClient();

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('addProjectMember', () => {
  it('adds somebody by their email address', async () => {
    const owner = await createTestUser(prisma);
    const tester = await createTestUser(prisma, { email: 'tester@example.com', name: 'Tess' });
    const project = await createTestProject(prisma, owner);

    const member = await addProjectMember(prisma, owner, project.id, {
      email: 'tester@example.com',
      role: 'QA',
    });

    expect(member).toMatchObject({ userId: tester.id, name: 'Tess', role: 'QA' });
  });

  it('finds the account whatever casing the address was typed in', async () => {
    const owner = await createTestUser(prisma);
    await createTestUser(prisma, { email: 'tester@example.com' });
    const project = await createTestProject(prisma, owner);

    const member = await addProjectMember(prisma, owner, project.id, {
      email: 'Tester@Example.COM',
      role: 'QA',
    });

    expect(member.email).toBe('tester@example.com');
  });

  it('lets a project manager add people', async () => {
    const owner = await createTestUser(prisma);
    const manager = await createTestUser(prisma);
    await createTestUser(prisma, { email: 'tester@example.com' });
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, manager, 'PROJECT_MANAGER');

    await expect(
      addProjectMember(prisma, manager, project.id, { email: 'tester@example.com', role: 'QA' }),
    ).resolves.toMatchObject({ role: 'QA' });
  });

  it('refuses a tester', async () => {
    const owner = await createTestUser(prisma);
    const tester = await createTestUser(prisma);
    await createTestUser(prisma, { email: 'newcomer@example.com' });
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, tester, 'QA');

    await expect(
      addProjectMember(prisma, tester, project.id, { email: 'newcomer@example.com', role: 'QA' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('refuses a non-member without revealing that the project exists', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    await createTestUser(prisma, { email: 'newcomer@example.com' });
    const project = await createTestProject(prisma, owner);

    await expect(
      addProjectMember(prisma, stranger, project.id, {
        email: 'newcomer@example.com',
        role: 'QA',
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('says so when no account exists for that address', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(
      addProjectMember(prisma, owner, project.id, { email: 'nobody@example.com', role: 'QA' }),
    ).rejects.toThrow('No account exists for that email address');
  });

  it('refuses to add the same person twice', async () => {
    const owner = await createTestUser(prisma);
    await createTestUser(prisma, { email: 'tester@example.com' });
    const project = await createTestProject(prisma, owner);

    await addProjectMember(prisma, owner, project.id, { email: 'tester@example.com', role: 'QA' });

    await expect(
      addProjectMember(prisma, owner, project.id, {
        email: 'tester@example.com',
        role: 'DEVELOPER',
      }),
    ).rejects.toThrow(ConflictError);
  });
});

describe('listProjectMembers', () => {
  it('is visible to every member, including developers', async () => {
    const owner = await createTestUser(prisma);
    const developer = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    expect(await listProjectMembers(prisma, developer, project.id)).toHaveLength(2);
  });

  it('is not visible to a non-member', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(listProjectMembers(prisma, stranger, project.id)).rejects.toThrow(NotFoundError);
  });
});

describe('updateProjectMemberRole', () => {
  it('changes the role somebody holds', async () => {
    const owner = await createTestUser(prisma);
    const member = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, member, 'DEVELOPER');

    const updated = await updateProjectMemberRole(prisma, owner, project.id, member.id, {
      role: 'QA',
    });

    expect(updated.role).toBe('QA');
  });

  it('refuses a tester', async () => {
    const owner = await createTestUser(prisma);
    const tester = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, tester, 'QA');

    await expect(
      updateProjectMemberRole(prisma, tester, project.id, owner.id, { role: 'DEVELOPER' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('says so when the person is not in the project', async () => {
    const owner = await createTestUser(prisma);
    const outsider = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(
      updateProjectMemberRole(prisma, owner, project.id, outsider.id, { role: 'QA' }),
    ).rejects.toThrow('That person is not a member of this project');
  });

  it('refuses to demote the last administrator', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(
      updateProjectMemberRole(prisma, owner, project.id, owner.id, { role: 'QA' }),
    ).rejects.toThrow('A project must always have at least one administrator');
  });

  it('allows that demotion once a second administrator exists', async () => {
    const owner = await createTestUser(prisma);
    const successor = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, successor, 'ADMIN');

    await expect(
      updateProjectMemberRole(prisma, owner, project.id, owner.id, { role: 'QA' }),
    ).resolves.toMatchObject({ role: 'QA' });
  });
});

describe('removeProjectMember', () => {
  it('removes somebody from the project', async () => {
    const owner = await createTestUser(prisma);
    const member = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, member, 'QA');

    await removeProjectMember(prisma, owner, project.id, member.id);

    expect(await listProjectMembers(prisma, owner, project.id)).toHaveLength(1);
  });

  it('leaves the account itself alone', async () => {
    const owner = await createTestUser(prisma);
    const member = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, member, 'QA');

    await removeProjectMember(prisma, owner, project.id, member.id);

    expect(await prisma.user.findUnique({ where: { id: member.id } })).not.toBeNull();
  });

  it('refuses a developer', async () => {
    const owner = await createTestUser(prisma);
    const developer = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await expect(removeProjectMember(prisma, developer, project.id, owner.id)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('refuses to remove the last administrator', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(removeProjectMember(prisma, owner, project.id, owner.id)).rejects.toThrow(
      ConflictError,
    );
  });
});
