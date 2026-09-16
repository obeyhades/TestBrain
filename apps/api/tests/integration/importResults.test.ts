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

    expect(summary).toEqual({ recorded: 3, addedToRun: 3, created: [] });

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

  it('creates a test case for a name it has never seen, and records its result', async () => {
    const { owner, project, run } = await setUp();

    const summary = await importTestResults(prisma, owner, project.id, run.id, {
      report: `<testsuite>
        <testcase name="Login"/>
        <testcase name="A test nobody wrote a case for"><failure message="it broke"/></testcase>
      </testsuite>`,
    });

    expect(summary).toEqual({
      recorded: 2,
      addedToRun: 2,
      created: ['A test nobody wrote a case for'],
    });

    const createdCase = await prisma.testCase.findFirst({
      where: { projectId: project.id, title: 'A test nobody wrote a case for' },
    });
    expect(createdCase?.createdById).toBe(owner.id);

    const detail = await getTestRun(prisma, owner, project.id, run.id);
    expect(
      detail.results.find((result) => result.title === 'A test nobody wrote a case for'),
    ).toMatchObject({ status: 'FAILED', notes: 'it broke' });
  });

  it('creates a repeated new name only once, and the last result for it wins', async () => {
    const { owner, project, run } = await setUp();

    const summary = await importTestResults(prisma, owner, project.id, run.id, {
      report: `<testsuites>
        <testsuite name="chromium"><testcase name="Brand new"/></testsuite>
        <testsuite name="firefox"><testcase name="Brand new"><failure message="only here"/></testcase></testsuite>
      </testsuites>`,
    });

    expect(summary.created).toEqual(['Brand new']);
    expect(
      await prisma.testCase.count({ where: { projectId: project.id, title: 'Brand new' } }),
    ).toBe(1);

    const detail = await getTestRun(prisma, owner, project.id, run.id);
    expect(detail.results.find((result) => result.title === 'Brand new')?.status).toBe('FAILED');
  });

  it('ignores a test case with no name rather than creating a nameless one', async () => {
    const { owner, project, run } = await setUp();

    const summary = await importTestResults(prisma, owner, project.id, run.id, {
      report: '<testsuite><testcase name="Login"/><testcase/></testsuite>',
    });

    expect(summary.recorded).toBe(1);
    expect(await prisma.testCase.count({ where: { projectId: project.id, title: '' } })).toBe(0);
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
