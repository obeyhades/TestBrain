import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPrismaClient, resetDatabase } from '../helpers/testDatabase.js';
import { addTestMember, createTestProject, createTestUser } from '../helpers/fixtures.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../src/shared/errors.js';
import { createRequirement } from '../../src/modules/requirements/requirement.service.js';
import {
  createTestCase,
  deleteTestCase,
  getTestCase,
  listTestCases,
  updateTestCase,
} from '../../src/modules/testCases/testCase.service.js';

const prisma = createTestPrismaClient();

const LOGIN_TEST = {
  title: 'User can log in using valid credentials',
  priority: 'HIGH',
  requirementId: null,
  steps: [
    { action: 'Open the login page', expectedResult: 'The login form is shown' },
    { action: 'Enter valid credentials', expectedResult: 'They are accepted' },
    { action: 'Press Login', expectedResult: 'The dashboard is shown' },
  ],
} as const;

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('createTestCase', () => {
  it('stores the steps in the order they were given, numbered from one', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    const testCase = await createTestCase(prisma, owner, project.id, {
      ...LOGIN_TEST,
      steps: [...LOGIN_TEST.steps],
    });

    expect(testCase.steps.map((step) => step.position)).toEqual([1, 2, 3]);
    expect(testCase.steps[0]?.action).toBe('Open the login page');
    expect(testCase.steps[2]?.expectedResult).toBe('The dashboard is shown');
  });

  it('allows a test case with no steps yet', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    const testCase = await createTestCase(prisma, owner, project.id, {
      title: 'Placeholder',
      priority: 'MEDIUM',
      requirementId: null,
      steps: [],
    });

    expect(testCase.steps).toEqual([]);
  });

  it('can be linked to a requirement in the same project', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    const requirement = await createRequirement(prisma, owner, project.id, {
      title: 'User can sign in',
      status: 'APPROVED',
    });

    const testCase = await createTestCase(prisma, owner, project.id, {
      ...LOGIN_TEST,
      steps: [...LOGIN_TEST.steps],
      requirementId: requirement.id,
    });

    expect(testCase.requirement).toEqual({ id: requirement.id, title: 'User can sign in' });
  });

  it('refuses a requirement that belongs to another project', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const mine = await createTestProject(prisma, owner, 'Mine');
    const theirs = await createTestProject(prisma, stranger, 'Theirs');

    const theirRequirement = await createRequirement(prisma, stranger, theirs.id, {
      title: 'Their requirement',
      status: 'DRAFT',
    });

    // Otherwise the link itself would reveal that another project's requirement exists.
    await expect(
      createTestCase(prisma, owner, mine.id, {
        ...LOGIN_TEST,
        steps: [...LOGIN_TEST.steps],
        requirementId: theirRequirement.id,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('refuses a developer', async () => {
    const owner = await createTestUser(prisma);
    const developer = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await expect(
      createTestCase(prisma, developer, project.id, { ...LOGIN_TEST, steps: [] }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('refuses a non-member without admitting the project exists', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(
      createTestCase(prisma, stranger, project.id, { ...LOGIN_TEST, steps: [] }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('updateTestCase replaces the whole list of steps', () => {
  async function withThreeSteps() {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    const testCase = await createTestCase(prisma, owner, project.id, {
      ...LOGIN_TEST,
      steps: [...LOGIN_TEST.steps],
    });

    return { owner, project, testCase };
  }

  it('renumbers after a step is removed from the middle', async () => {
    const { owner, project, testCase } = await withThreeSteps();

    const updated = await updateTestCase(prisma, owner, project.id, testCase.id, {
      ...LOGIN_TEST,
      requirementId: null,
      steps: [LOGIN_TEST.steps[0], LOGIN_TEST.steps[2]],
    });

    expect(updated.steps.map((step) => step.position)).toEqual([1, 2]);
    expect(updated.steps[1]?.action).toBe('Press Login');
  });

  it('renumbers after two steps swap places', async () => {
    const { owner, project, testCase } = await withThreeSteps();

    const updated = await updateTestCase(prisma, owner, project.id, testCase.id, {
      ...LOGIN_TEST,
      requirementId: null,
      steps: [LOGIN_TEST.steps[1], LOGIN_TEST.steps[0], LOGIN_TEST.steps[2]],
    });

    expect(updated.steps.map((step) => step.action)).toEqual([
      'Enter valid credentials',
      'Open the login page',
      'Press Login',
    ]);
    expect(updated.steps.map((step) => step.position)).toEqual([1, 2, 3]);
  });

  it('leaves no orphaned steps behind in the database', async () => {
    const { owner, project, testCase } = await withThreeSteps();

    await updateTestCase(prisma, owner, project.id, testCase.id, {
      ...LOGIN_TEST,
      requirementId: null,
      steps: [LOGIN_TEST.steps[0]],
    });

    expect(await prisma.testStep.count()).toBe(1);
  });

  it('refuses a developer', async () => {
    const { project, testCase } = await withThreeSteps();
    const developer = await createTestUser(prisma);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await expect(
      updateTestCase(prisma, developer, project.id, testCase.id, {
        ...LOGIN_TEST,
        requirementId: null,
        steps: [],
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('a test case id from another project is not a key to it', () => {
  async function setUpTwoProjects() {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const mine = await createTestProject(prisma, owner, 'Mine');
    const theirs = await createTestProject(prisma, stranger, 'Theirs');

    const theirTestCase = await createTestCase(prisma, stranger, theirs.id, {
      ...LOGIN_TEST,
      steps: [...LOGIN_TEST.steps],
      title: 'Their secret test',
    });

    return { owner, mine, theirTestCase };
  }

  it('cannot be read', async () => {
    const { owner, mine, theirTestCase } = await setUpTwoProjects();

    await expect(getTestCase(prisma, owner, mine.id, theirTestCase.id)).rejects.toThrow(
      NotFoundError,
    );
  });

  it('cannot be changed', async () => {
    const { owner, mine, theirTestCase } = await setUpTwoProjects();

    await expect(
      updateTestCase(prisma, owner, mine.id, theirTestCase.id, {
        ...LOGIN_TEST,
        title: 'Hijacked',
        requirementId: null,
        steps: [],
      }),
    ).rejects.toThrow(NotFoundError);

    const untouched = await prisma.testCase.findUniqueOrThrow({ where: { id: theirTestCase.id } });
    expect(untouched.title).toBe('Their secret test');
  });

  it('cannot be deleted', async () => {
    const { owner, mine, theirTestCase } = await setUpTwoProjects();

    await expect(deleteTestCase(prisma, owner, mine.id, theirTestCase.id)).rejects.toThrow(
      NotFoundError,
    );

    expect(await prisma.testCase.count()).toBe(1);
  });
});

describe('listTestCases', () => {
  it('is readable by every member, developers included', async () => {
    const owner = await createTestUser(prisma);
    const developer = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');
    await createTestCase(prisma, owner, project.id, { ...LOGIN_TEST, steps: [] });

    expect(await listTestCases(prisma, developer, project.id)).toHaveLength(1);
  });
});

describe('deleteTestCase', () => {
  it('takes its steps with it', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    const testCase = await createTestCase(prisma, owner, project.id, {
      ...LOGIN_TEST,
      steps: [...LOGIN_TEST.steps],
    });

    await deleteTestCase(prisma, owner, project.id, testCase.id);

    expect(await prisma.testStep.count()).toBe(0);
  });

  it('survives its requirement being deleted, without being deleted itself', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    const requirement = await createRequirement(prisma, owner, project.id, {
      title: 'Doomed requirement',
      status: 'DRAFT',
    });
    const testCase = await createTestCase(prisma, owner, project.id, {
      ...LOGIN_TEST,
      steps: [],
      requirementId: requirement.id,
    });

    await prisma.requirement.delete({ where: { id: requirement.id } });

    const stillThere = await getTestCase(prisma, owner, project.id, testCase.id);

    expect(stillThere.requirement).toBeNull();
  });
});
