import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPrismaClient, resetDatabase } from '../helpers/testDatabase.js';
import { addTestMember, createTestProject, createTestUser } from '../helpers/fixtures.js';
import { ForbiddenError, NotFoundError } from '../../src/shared/errors.js';
import {
  createRequirement,
  deleteRequirement,
  getRequirement,
  listRequirements,
  updateRequirement,
} from '../../src/modules/requirements/requirement.service.js';

const prisma = createTestPrismaClient();

const DRAFT = { title: 'User can sign in', status: 'DRAFT' } as const;

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('createRequirement', () => {
  it('stores what it was given and defaults to draft', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    const requirement = await createRequirement(prisma, owner, project.id, DRAFT);

    expect(requirement).toMatchObject({ title: 'User can sign in', status: 'DRAFT' });
  });

  it('lets a tester write requirements', async () => {
    const owner = await createTestUser(prisma);
    const tester = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, tester, 'QA');

    await expect(createRequirement(prisma, tester, project.id, DRAFT)).resolves.toMatchObject({
      title: 'User can sign in',
    });
  });

  it('refuses a developer, who reads requirements but does not own them', async () => {
    const owner = await createTestUser(prisma);
    const developer = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await expect(createRequirement(prisma, developer, project.id, DRAFT)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('refuses a non-member without admitting the project exists', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(createRequirement(prisma, stranger, project.id, DRAFT)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('listRequirements', () => {
  it('is readable by every member, developers included', async () => {
    const owner = await createTestUser(prisma);
    const developer = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');
    await createRequirement(prisma, owner, project.id, DRAFT);

    expect(await listRequirements(prisma, developer, project.id)).toHaveLength(1);
  });

  it('shows only the requirements of the project asked for', async () => {
    const owner = await createTestUser(prisma);
    const mine = await createTestProject(prisma, owner, 'Mine');
    const alsoMine = await createTestProject(prisma, owner, 'Also mine');

    await createRequirement(prisma, owner, mine.id, DRAFT);
    await createRequirement(prisma, owner, alsoMine.id, { title: 'Different', status: 'DRAFT' });

    const listed = await listRequirements(prisma, owner, mine.id);

    expect(listed.map((requirement) => requirement.title)).toEqual(['User can sign in']);
  });

  it('is not readable by a non-member', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(listRequirements(prisma, stranger, project.id)).rejects.toThrow(NotFoundError);
  });
});

describe('a requirement id from another project is not a key to it', () => {
  /**
   * The bug this guards against: scoping a lookup by requirement id alone. Somebody
   * who belongs to one project would then be able to read, change or delete another
   * project's requirement simply by putting its id in the URL alongside their own
   * project id.
   */
  async function setUpTwoProjects() {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);

    const mine = await createTestProject(prisma, owner, 'Mine');
    const theirs = await createTestProject(prisma, stranger, 'Theirs');

    const theirRequirement = await createRequirement(prisma, stranger, theirs.id, {
      title: 'Their secret requirement',
      status: 'DRAFT',
    });

    return { owner, mine, theirRequirement };
  }

  it('cannot be read', async () => {
    const { owner, mine, theirRequirement } = await setUpTwoProjects();

    await expect(getRequirement(prisma, owner, mine.id, theirRequirement.id)).rejects.toThrow(
      NotFoundError,
    );
  });

  it('cannot be changed', async () => {
    const { owner, mine, theirRequirement } = await setUpTwoProjects();

    await expect(
      updateRequirement(prisma, owner, mine.id, theirRequirement.id, {
        title: 'Hijacked',
        status: 'IMPLEMENTED',
      }),
    ).rejects.toThrow(NotFoundError);

    const untouched = await prisma.requirement.findUniqueOrThrow({
      where: { id: theirRequirement.id },
    });

    expect(untouched.title).toBe('Their secret requirement');
  });

  it('cannot be deleted', async () => {
    const { owner, mine, theirRequirement } = await setUpTwoProjects();

    await expect(deleteRequirement(prisma, owner, mine.id, theirRequirement.id)).rejects.toThrow(
      NotFoundError,
    );

    expect(await prisma.requirement.count()).toBe(1);
  });
});

describe('updateRequirement', () => {
  it('changes the fields it was given', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    const requirement = await createRequirement(prisma, owner, project.id, DRAFT);

    const updated = await updateRequirement(prisma, owner, project.id, requirement.id, {
      title: 'User can sign in with SSO',
      status: 'APPROVED',
    });

    expect(updated).toMatchObject({ title: 'User can sign in with SSO', status: 'APPROVED' });
  });

  it('refuses a developer', async () => {
    const owner = await createTestUser(prisma);
    const developer = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');
    const requirement = await createRequirement(prisma, owner, project.id, DRAFT);

    await expect(
      updateRequirement(prisma, developer, project.id, requirement.id, {
        title: 'Changed',
        status: 'DRAFT',
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('says not found for a requirement id that was never real', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(
      updateRequirement(prisma, owner, project.id, 'made-up-id', {
        title: 'Changed',
        status: 'DRAFT',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('deleteRequirement', () => {
  it('removes it', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    const requirement = await createRequirement(prisma, owner, project.id, DRAFT);

    await deleteRequirement(prisma, owner, project.id, requirement.id);

    expect(await listRequirements(prisma, owner, project.id)).toEqual([]);
  });

  it('refuses a developer', async () => {
    const owner = await createTestUser(prisma);
    const developer = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');
    const requirement = await createRequirement(prisma, owner, project.id, DRAFT);

    await expect(deleteRequirement(prisma, developer, project.id, requirement.id)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('takes a project requirements with it when the project goes', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await createRequirement(prisma, owner, project.id, DRAFT);

    await prisma.project.delete({ where: { id: project.id } });

    expect(await prisma.requirement.count()).toBe(0);
  });
});
