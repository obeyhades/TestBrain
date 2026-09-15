import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPrismaClient, resetDatabase } from '../helpers/testDatabase.js';
import { addTestMember, createTestProject, createTestUser } from '../helpers/fixtures.js';
import { ForbiddenError, NotFoundError } from '../../src/shared/errors.js';
import {
  createProject,
  getProject,
  listProjectsForUser,
  updateProject,
} from '../../src/modules/projects/project.service.js';
import { listProjectMembers } from '../../src/modules/projects/projectMember.service.js';

const prisma = createTestPrismaClient();

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('createProject', () => {
  it('returns the project it created', async () => {
    const owner = await createTestUser(prisma);

    const project = await createProject(prisma, owner, { name: 'Checkout redesign' });

    expect(project.name).toBe('Checkout redesign');
  });

  it('makes the creator an administrator, so the project is never unmanageable', async () => {
    const owner = await createTestUser(prisma);

    const project = await createProject(prisma, owner, { name: 'Checkout redesign' });
    const members = await listProjectMembers(prisma, owner, project.id);

    expect(members).toEqual([expect.objectContaining({ userId: owner.id, role: 'ADMIN' })]);
  });
});

describe('listProjectsForUser', () => {
  it('lists only the projects the person belongs to', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);

    await createTestProject(prisma, owner, 'Mine');
    await createTestProject(prisma, stranger, 'Theirs');

    const visible = await listProjectsForUser(prisma, owner);

    expect(visible.map((project) => project.name)).toEqual(['Mine']);
  });

  it('is empty for somebody who belongs to nothing', async () => {
    const owner = await createTestUser(prisma);
    const newcomer = await createTestUser(prisma);
    await createTestProject(prisma, owner);

    expect(await listProjectsForUser(prisma, newcomer)).toEqual([]);
  });
});

describe('getProject', () => {
  it('is readable by any member, whatever their role', async () => {
    const owner = await createTestUser(prisma);
    const developer = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    expect((await getProject(prisma, developer, project.id)).id).toBe(project.id);
  });

  it('tells a non-member the project does not exist, rather than that it is off limits', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    // A 403 here would confirm that this project id is real.
    await expect(getProject(prisma, stranger, project.id)).rejects.toThrow(NotFoundError);
  });

  it('gives the same answer for a project id that was never real', async () => {
    const stranger = await createTestUser(prisma);

    await expect(getProject(prisma, stranger, 'made-up-id')).rejects.toThrow(NotFoundError);
  });
});

describe('updateProject', () => {
  it('lets an administrator rename the project', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    const updated = await updateProject(prisma, owner, project.id, { name: 'Renamed' });

    expect(updated.name).toBe('Renamed');
  });

  it('lets a project manager rename the project', async () => {
    const owner = await createTestUser(prisma);
    const manager = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, manager, 'PROJECT_MANAGER');

    expect((await updateProject(prisma, manager, project.id, { name: 'Renamed' })).name).toBe(
      'Renamed',
    );
  });

  it('refuses a tester', async () => {
    const owner = await createTestUser(prisma);
    const tester = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, tester, 'QA');

    await expect(updateProject(prisma, tester, project.id, { name: 'Renamed' })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('refuses a developer', async () => {
    const owner = await createTestUser(prisma);
    const developer = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await expect(updateProject(prisma, developer, project.id, { name: 'Renamed' })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('refuses a non-member, and changes nothing', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner, 'Untouched');

    await expect(updateProject(prisma, stranger, project.id, { name: 'Hijacked' })).rejects.toThrow(
      NotFoundError,
    );

    expect((await getProject(prisma, owner, project.id)).name).toBe('Untouched');
  });

  it('does not let an administrator of one project touch another', async () => {
    const owner = await createTestUser(prisma);
    const otherOwner = await createTestUser(prisma);
    await createTestProject(prisma, owner, 'Mine');
    const theirs = await createTestProject(prisma, otherOwner, 'Theirs');

    // Being an administrator is per project, not a status somebody carries around.
    await expect(updateProject(prisma, owner, theirs.id, { name: 'Hijacked' })).rejects.toThrow(
      NotFoundError,
    );
  });
});
