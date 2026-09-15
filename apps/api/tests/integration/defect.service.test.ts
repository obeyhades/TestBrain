import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPrismaClient, resetDatabase } from '../helpers/testDatabase.js';
import { addTestMember, createTestProject, createTestUser } from '../helpers/fixtures.js';
import { NotFoundError, ValidationError } from '../../src/shared/errors.js';
import { createTestCase } from '../../src/modules/testCases/testCase.service.js';
import { createTestRun } from '../../src/modules/testRuns/testRun.service.js';
import {
  createDefect,
  getDefect,
  listDefects,
  updateDefect,
} from '../../src/modules/defects/defect.service.js';

const prisma = createTestPrismaClient();

const BUG = {
  title: 'Login crashes on an empty password',
  severity: 'HIGH',
  testCaseId: null,
  testRunId: null,
  assignedToId: null,
} as const;

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('createDefect', () => {
  it('starts a new defect as open', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    const defect = await createDefect(prisma, owner, project.id, { ...BUG });

    expect(defect).toMatchObject({ title: BUG.title, severity: 'HIGH', status: 'OPEN' });
    expect(defect.createdBy.id).toBe(owner.id);
  });

  it('can be reported by a developer, who is the one fixing them', async () => {
    const owner = await createTestUser(prisma);
    const developer = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await expect(createDefect(prisma, developer, project.id, { ...BUG })).resolves.toMatchObject({
      status: 'OPEN',
    });
  });

  it('cannot be reported by somebody outside the project', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(createDefect(prisma, stranger, project.id, { ...BUG })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('remembers the failed test it came from', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    const testCase = await createTestCase(prisma, owner, project.id, {
      title: 'Login',
      priority: 'HIGH',
      requirementId: null,
      steps: [],
    });
    const run = await createTestRun(prisma, owner, project.id, { name: 'Regression' });

    const defect = await createDefect(prisma, owner, project.id, {
      ...BUG,
      testCaseId: testCase.id,
      testRunId: run.id,
    });

    expect(defect.testCase).toEqual({ id: testCase.id, title: 'Login' });
    expect(defect.testRun).toEqual({ id: run.id, name: 'Regression' });
  });

  it('refuses to point at a test case in another project', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const mine = await createTestProject(prisma, owner, 'Mine');
    const theirs = await createTestProject(prisma, stranger, 'Theirs');
    const theirTestCase = await createTestCase(prisma, stranger, theirs.id, {
      title: 'Their test',
      priority: 'LOW',
      requirementId: null,
      steps: [],
    });

    await expect(
      createDefect(prisma, owner, mine.id, { ...BUG, testCaseId: theirTestCase.id }),
    ).rejects.toThrow(ValidationError);
  });

  it('refuses to be assigned to somebody outside the project', async () => {
    const owner = await createTestUser(prisma);
    const outsider = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(
      createDefect(prisma, owner, project.id, { ...BUG, assignedToId: outsider.id }),
    ).rejects.toThrow('You can only assign a defect to a member of this project');
  });
});

describe('updateDefect', () => {
  async function reportedDefect() {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    const defect = await createDefect(prisma, owner, project.id, { ...BUG });

    return { owner, project, defect };
  }

  it('moves the defect along its statuses', async () => {
    const { owner, project, defect } = await reportedDefect();

    const inProgress = await updateDefect(prisma, owner, project.id, defect.id, {
      ...BUG,
      status: 'IN_PROGRESS',
    });

    expect(inProgress.status).toBe('IN_PROGRESS');

    const closed = await updateDefect(prisma, owner, project.id, defect.id, {
      ...BUG,
      status: 'CLOSED',
    });

    expect(closed.status).toBe('CLOSED');
  });

  it('lets a developer move it along, since they are fixing it', async () => {
    const { project, defect } = await reportedDefect();
    const developer = await createTestUser(prisma);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await expect(
      updateDefect(prisma, developer, project.id, defect.id, { ...BUG, status: 'READY_FOR_TEST' }),
    ).resolves.toMatchObject({ status: 'READY_FOR_TEST' });
  });

  it('can be assigned to a member of the project', async () => {
    const { owner, project, defect } = await reportedDefect();
    const developer = await createTestUser(prisma, { name: 'Dev Devsson' });
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    const assigned = await updateDefect(prisma, owner, project.id, defect.id, {
      ...BUG,
      status: 'IN_PROGRESS',
      assignedToId: developer.id,
    });

    expect(assigned.assignedTo).toEqual({ id: developer.id, name: 'Dev Devsson' });
  });

  it('keeps the reproduction details it was given', async () => {
    const { owner, project, defect } = await reportedDefect();

    const detailed = await updateDefect(prisma, owner, project.id, defect.id, {
      ...BUG,
      status: 'OPEN',
      stepsToReproduce: '1. Open login\n2. Leave the password empty\n3. Press Login',
      expectedResult: 'A validation message',
      actualResult: 'The page goes blank',
      environment: 'Firefox 140, Windows 11',
    });

    expect(detailed.actualResult).toBe('The page goes blank');
    expect(detailed.environment).toBe('Firefox 140, Windows 11');
  });

  it('cannot be changed from another project', async () => {
    const { defect } = await reportedDefect();
    const stranger = await createTestUser(prisma);
    const theirProject = await createTestProject(prisma, stranger, 'Theirs');

    await expect(
      updateDefect(prisma, stranger, theirProject.id, defect.id, { ...BUG, status: 'CLOSED' }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('a defect outlives what it came from', () => {
  it('survives its test case being deleted', async () => {
    const owner = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);
    const testCase = await createTestCase(prisma, owner, project.id, {
      title: 'Doomed test',
      priority: 'LOW',
      requirementId: null,
      steps: [],
    });
    const defect = await createDefect(prisma, owner, project.id, {
      ...BUG,
      testCaseId: testCase.id,
    });

    await prisma.testCase.delete({ where: { id: testCase.id } });

    const stillThere = await getDefect(prisma, owner, project.id, defect.id);

    expect(stillThere.title).toBe(BUG.title);
    expect(stillThere.testCase).toBeNull();
  });
});

describe('listDefects', () => {
  it('shows only the defects of the project asked for', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const mine = await createTestProject(prisma, owner, 'Mine');
    const theirs = await createTestProject(prisma, stranger, 'Theirs');

    await createDefect(prisma, owner, mine.id, { ...BUG, title: 'Mine' });
    await createDefect(prisma, stranger, theirs.id, { ...BUG, title: 'Theirs' });

    const listed = await listDefects(prisma, owner, mine.id);

    expect(listed.map((defect) => defect.title)).toEqual(['Mine']);
  });

  it('is not readable by a non-member', async () => {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const project = await createTestProject(prisma, owner);

    await expect(listDefects(prisma, stranger, project.id)).rejects.toThrow(NotFoundError);
  });
});
