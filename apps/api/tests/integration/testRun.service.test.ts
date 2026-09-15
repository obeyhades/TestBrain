import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPrismaClient, resetDatabase } from '../helpers/testDatabase.js';
import { addTestMember, createTestProject, createTestUser } from '../helpers/fixtures.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../src/shared/errors.js';
import { createTestCase } from '../../src/modules/testCases/testCase.service.js';
import {
  addTestCasesToRun,
  createTestRun,
  getTestRun,
  listTestRuns,
  recordTestResult,
  removeTestCaseFromRun,
  setTestRunCompleted,
} from '../../src/modules/testRuns/testRun.service.js';

const prisma = createTestPrismaClient();

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** A project with three test cases and one run containing all of them. */
async function setUpRun() {
  const owner = await createTestUser(prisma);
  const project = await createTestProject(prisma, owner);

  const titles = ['Login', 'Create account', 'Password reset'];
  const testCases = [];

  for (const title of titles) {
    testCases.push(
      await createTestCase(prisma, owner, project.id, {
        title,
        priority: 'MEDIUM',
        requirementId: null,
        steps: [],
      }),
    );
  }

  const run = await createTestRun(prisma, owner, project.id, { name: 'Regression - v1.4.0' });

  await addTestCasesToRun(prisma, owner, project.id, run.id, {
    testCaseIds: testCases.map((testCase) => testCase.id),
  });

  return { owner, project, run, testCases };
}

describe('adding test cases to a run', () => {
  it('puts them in as not run yet', async () => {
    const { owner, project, run } = await setUpRun();

    const detail = await getTestRun(prisma, owner, project.id, run.id);

    expect(detail.results).toHaveLength(3);
    expect(detail.summary).toMatchObject({ total: 3, notRun: 3, passed: 0 });
  });

  it('ignores a test case that is already in the run', async () => {
    const { owner, project, run, testCases } = await setUpRun();

    await addTestCasesToRun(prisma, owner, project.id, run.id, {
      testCaseIds: [testCases[0]!.id],
    });

    expect((await getTestRun(prisma, owner, project.id, run.id)).results).toHaveLength(3);
  });

  it('refuses a test case from another project, and adds none of the batch', async () => {
    const { owner, project, run } = await setUpRun();
    const stranger = await createTestUser(prisma);
    const theirProject = await createTestProject(prisma, stranger, 'Theirs');
    const theirTestCase = await createTestCase(prisma, stranger, theirProject.id, {
      title: 'Their test',
      priority: 'LOW',
      requirementId: null,
      steps: [],
    });

    await expect(
      addTestCasesToRun(prisma, owner, project.id, run.id, {
        testCaseIds: [theirTestCase.id],
      }),
    ).rejects.toThrow(ValidationError);

    expect((await getTestRun(prisma, owner, project.id, run.id)).results).toHaveLength(3);
  });

  it('refuses a developer', async () => {
    const { project, run, testCases } = await setUpRun();
    const developer = await createTestUser(prisma);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await expect(
      addTestCasesToRun(prisma, developer, project.id, run.id, {
        testCaseIds: [testCases[0]!.id],
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('recording results', () => {
  it('records a pass and remembers who ran it', async () => {
    const { owner, project, run, testCases } = await setUpRun();

    await recordTestResult(prisma, owner, project.id, run.id, testCases[0]!.id, {
      status: 'PASSED',
    });

    const detail = await getTestRun(prisma, owner, project.id, run.id);
    const result = detail.results.find((r) => r.testCaseId === testCases[0]!.id);

    expect(result?.status).toBe('PASSED');
    expect(result?.executedBy).toBe(owner.name);
    expect(result?.executedAt).toBeInstanceOf(Date);
  });

  it('keeps the notes written with a failure', async () => {
    const { owner, project, run, testCases } = await setUpRun();

    await recordTestResult(prisma, owner, project.id, run.id, testCases[0]!.id, {
      status: 'FAILED',
      notes: 'Crashes on an empty password',
    });

    const detail = await getTestRun(prisma, owner, project.id, run.id);

    expect(detail.results.find((r) => r.testCaseId === testCases[0]!.id)?.notes).toBe(
      'Crashes on an empty password',
    );
  });

  it('forgets who ran it when a result is put back to not run', async () => {
    const { owner, project, run, testCases } = await setUpRun();

    await recordTestResult(prisma, owner, project.id, run.id, testCases[0]!.id, {
      status: 'PASSED',
    });
    await recordTestResult(prisma, owner, project.id, run.id, testCases[0]!.id, {
      status: 'NOT_RUN',
    });

    const result = (await getTestRun(prisma, owner, project.id, run.id)).results.find(
      (r) => r.testCaseId === testCases[0]!.id,
    );

    expect(result?.executedBy).toBeNull();
    expect(result?.executedAt).toBeNull();
  });

  it('refuses a test case that is not part of the run', async () => {
    const { owner, project, run } = await setUpRun();
    const outsider = await createTestCase(prisma, owner, project.id, {
      title: 'Not in the run',
      priority: 'LOW',
      requirementId: null,
      steps: [],
    });

    await expect(
      recordTestResult(prisma, owner, project.id, run.id, outsider.id, { status: 'PASSED' }),
    ).rejects.toThrow('That test case is not part of this run');
  });

  it('refuses a developer', async () => {
    const { project, run, testCases } = await setUpRun();
    const developer = await createTestUser(prisma);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await expect(
      recordTestResult(prisma, developer, project.id, run.id, testCases[0]!.id, {
        status: 'PASSED',
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('is readable by a developer even though they cannot record it', async () => {
    const { owner, project, run, testCases } = await setUpRun();
    const developer = await createTestUser(prisma);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await recordTestResult(prisma, owner, project.id, run.id, testCases[0]!.id, {
      status: 'FAILED',
      notes: 'Broken',
    });

    const seen = await getTestRun(prisma, developer, project.id, run.id);

    expect(seen.summary.failed).toBe(1);
  });
});

describe('the summary of a run', () => {
  it('counts results and leaves blocked tests out of the pass rate', async () => {
    const { owner, project, run, testCases } = await setUpRun();

    await recordTestResult(prisma, owner, project.id, run.id, testCases[0]!.id, {
      status: 'PASSED',
    });
    await recordTestResult(prisma, owner, project.id, run.id, testCases[1]!.id, {
      status: 'FAILED',
    });
    await recordTestResult(prisma, owner, project.id, run.id, testCases[2]!.id, {
      status: 'BLOCKED',
    });

    const { summary } = await getTestRun(prisma, owner, project.id, run.id);

    expect(summary).toEqual({
      total: 3,
      passed: 1,
      failed: 1,
      blocked: 1,
      notRun: 0,
      passRate: 50,
    });
  });

  it('appears in the run list too, so the history is readable at a glance', async () => {
    const { owner, project, run, testCases } = await setUpRun();

    await recordTestResult(prisma, owner, project.id, run.id, testCases[0]!.id, {
      status: 'PASSED',
    });

    const listed = await listTestRuns(prisma, owner, project.id);

    expect(listed[0]?.summary).toMatchObject({ total: 3, passed: 1, notRun: 2 });
  });
});

describe('a run id from another project is not a key to it', () => {
  async function twoProjects() {
    const owner = await createTestUser(prisma);
    const stranger = await createTestUser(prisma);
    const mine = await createTestProject(prisma, owner, 'Mine');
    const theirs = await createTestProject(prisma, stranger, 'Theirs');
    const theirRun = await createTestRun(prisma, stranger, theirs.id, { name: 'Their run' });

    return { owner, mine, theirRun };
  }

  it('cannot be read', async () => {
    const { owner, mine, theirRun } = await twoProjects();

    await expect(getTestRun(prisma, owner, mine.id, theirRun.id)).rejects.toThrow(NotFoundError);
  });

  it('cannot be completed', async () => {
    const { owner, mine, theirRun } = await twoProjects();

    await expect(setTestRunCompleted(prisma, owner, mine.id, theirRun.id, true)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('managing a run', () => {
  it('can be marked complete and reopened', async () => {
    const { owner, project, run } = await setUpRun();

    await setTestRunCompleted(prisma, owner, project.id, run.id, true);
    expect((await getTestRun(prisma, owner, project.id, run.id)).status).toBe('COMPLETED');

    await setTestRunCompleted(prisma, owner, project.id, run.id, false);
    expect((await getTestRun(prisma, owner, project.id, run.id)).status).toBe('OPEN');
  });

  it('can have a test case taken back out', async () => {
    const { owner, project, run, testCases } = await setUpRun();

    await removeTestCaseFromRun(prisma, owner, project.id, run.id, testCases[0]!.id);

    expect((await getTestRun(prisma, owner, project.id, run.id)).results).toHaveLength(2);
  });

  it('loses its results when the test case itself is deleted', async () => {
    const { run, testCases } = await setUpRun();

    await prisma.testCase.delete({ where: { id: testCases[0]!.id } });

    expect(await prisma.testResult.count({ where: { testRunId: run.id } })).toBe(2);
  });
});
