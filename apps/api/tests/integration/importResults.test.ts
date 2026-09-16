import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPrismaClient, resetDatabase } from '../helpers/testDatabase.js';
import { addTestMember, createTestProject, createTestUser } from '../helpers/fixtures.js';
import { ForbiddenError, ValidationError } from '../../src/shared/errors.js';
import { createTestCase } from '../../src/modules/testCases/testCase.service.js';
import {
  addTestCasesToRun,
  createTestRun,
  getTestRun,
  importTestResults,
  recordTestResult,
} from '../../src/modules/testRuns/testRun.service.js';

const prisma = createTestPrismaClient();

const REPORT = `<?xml version="1.0"?>
<testsuites>
  <testsuite name="checkout.spec.ts">
    <testcase name="Login"/>
    <testcase name="Checkout">
      <failure message="expected the order number to be shown"/>
    </testcase>
    <testcase name="Offline mode">
      <skipped message="no network simulation on CI"/>
    </testcase>
  </testsuite>
</testsuites>`;

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** A project with three test cases whose titles match the report, and an empty run. */
async function setUp() {
  const owner = await createTestUser(prisma, { name: 'Ada' });
  const project = await createTestProject(prisma, owner);

  for (const title of ['Login', 'Checkout', 'Offline mode']) {
    await createTestCase(prisma, owner, project.id, {
      title,
      priority: 'MEDIUM',
      requirementId: null,
      steps: [],
    });
  }

  const run = await createTestRun(prisma, owner, project.id, { name: 'CI run' });

  return { owner, project, run };
}

describe('importTestResults', () => {
  it('fills the run in from the report, matching on title', async () => {
    const { owner, project, run } = await setUp();

    const summary = await importTestResults(prisma, owner, project.id, run.id, {
      report: REPORT,
    });

    expect(summary).toEqual({ recorded: 3, addedToRun: 3, unmatched: [] });

    const detail = await getTestRun(prisma, owner, project.id, run.id);
    const byTitle = new Map(detail.results.map((result) => [result.title, result]));

    expect(byTitle.get('Login')?.status).toBe('PASSED');
    expect(byTitle.get('Checkout')).toMatchObject({
      status: 'FAILED',
      notes: 'expected the order number to be shown',
    });
    expect(byTitle.get('Offline mode')).toMatchObject({
      status: 'BLOCKED',
      notes: 'no network simulation on CI',
    });
  });

  it('records who imported it, the same way a hand-recorded result would', async () => {
    const { owner, project, run } = await setUp();

    await importTestResults(prisma, owner, project.id, run.id, { report: REPORT });

    const detail = await getTestRun(prisma, owner, project.id, run.id);

    expect(detail.results.every((result) => result.executedBy === 'Ada')).toBe(true);
    expect(detail.summary).toMatchObject({ passed: 1, failed: 1, blocked: 1, passRate: 50 });
  });

  it('reports names that match no test case instead of dropping them', async () => {
    const { owner, project, run } = await setUp();

    const summary = await importTestResults(prisma, owner, project.id, run.id, {
      report: `<testsuite>
        <testcase name="Login"/>
        <testcase name="A test nobody wrote a case for"/>
      </testsuite>`,
    });

    expect(summary.recorded).toBe(1);
    expect(summary.unmatched).toEqual(['A test nobody wrote a case for']);
  });

  it('does not add a case that is already in the run twice', async () => {
    const { owner, project, run } = await setUp();
    const detailBefore = await getTestRun(prisma, owner, project.id, run.id);
    expect(detailBefore.results).toHaveLength(0);

    await importTestResults(prisma, owner, project.id, run.id, { report: REPORT });
    const summary = await importTestResults(prisma, owner, project.id, run.id, {
      report: REPORT,
    });

    expect(summary.addedToRun).toBe(0);
    expect((await getTestRun(prisma, owner, project.id, run.id)).results).toHaveLength(3);
  });

  it('leaves results the report does not mention alone', async () => {
    const { owner, project, run } = await setUp();

    const loginId = (await prisma.testCase.findFirstOrThrow({ where: { title: 'Login' } })).id;
    await addTestCasesToRun(prisma, owner, project.id, run.id, { testCaseIds: [loginId] });
    await recordTestResult(prisma, owner, project.id, run.id, loginId, {
      status: 'PASSED',
      notes: 'checked by hand',
    });

    await importTestResults(prisma, owner, project.id, run.id, {
      report: `<testsuite><testcase name="Checkout"><failure message="boom"/></testcase></testsuite>`,
    });

    const after = await getTestRun(prisma, owner, project.id, run.id);
    const login = after.results.find((result) => result.title === 'Login');

    expect(login).toMatchObject({ status: 'PASSED', notes: 'checked by hand' });
  });

  it('refuses a file that is not a JUnit report, and changes nothing', async () => {
    const { owner, project, run } = await setUp();

    await expect(
      importTestResults(prisma, owner, project.id, run.id, { report: '<html/>' }),
    ).rejects.toThrow(ValidationError);

    expect((await getTestRun(prisma, owner, project.id, run.id)).results).toHaveLength(0);
  });

  it('refuses a developer, like recording a result by hand does', async () => {
    const { project, run } = await setUp();
    const developer = await createTestUser(prisma);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await expect(
      importTestResults(prisma, developer, project.id, run.id, { report: REPORT }),
    ).rejects.toThrow(ForbiddenError);
  });
});
