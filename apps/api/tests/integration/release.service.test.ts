import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestPrismaClient, resetDatabase } from '../helpers/testDatabase.js';
import { addTestMember, createTestProject, createTestUser } from '../helpers/fixtures.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../src/shared/errors.js';
import { createTestCase } from '../../src/modules/testCases/testCase.service.js';
import {
  addTestCasesToRun,
  createTestRun,
  recordTestResult,
} from '../../src/modules/testRuns/testRun.service.js';
import { createDefect, updateDefect } from '../../src/modules/defects/defect.service.js';
import {
  createRelease,
  getRelease,
  listReleases,
  setReleaseTestRuns,
  updateRelease,
} from '../../src/modules/releases/release.service.js';

const prisma = createTestPrismaClient();

const RELEASE = {
  name: 'Autumn release',
  version: 'v1.4.0',
  status: 'IN_TESTING',
  targetDate: null,
} as const;

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** A release with one run of two test cases pointed at it. */
async function setUpRelease() {
  const owner = await createTestUser(prisma);
  const project = await createTestProject(prisma, owner);

  const testCases = [];
  for (const title of ['Login', 'Checkout']) {
    testCases.push(
      await createTestCase(prisma, owner, project.id, {
        title,
        priority: 'HIGH',
        requirementId: null,
        steps: [],
      }),
    );
  }

  const run = await createTestRun(prisma, owner, project.id, { name: 'Regression' });
  await addTestCasesToRun(prisma, owner, project.id, run.id, {
    testCaseIds: testCases.map((testCase) => testCase.id),
  });

  const release = await createRelease(prisma, owner, project.id, { ...RELEASE });
  await setReleaseTestRuns(prisma, owner, project.id, release.id, { testRunIds: [run.id] });

  return { owner, project, run, release, testCases };
}

describe('release quality', () => {
  it('is ready once every test in its runs has passed', async () => {
    const { owner, project, run, release, testCases } = await setUpRelease();

    for (const testCase of testCases) {
      await recordTestResult(prisma, owner, project.id, run.id, testCase.id, { status: 'PASSED' });
    }

    const detail = await getRelease(prisma, owner, project.id, release.id);

    expect(detail.quality.readiness).toBe('READY');
    expect(detail.quality.summary).toMatchObject({ total: 2, passed: 2 });
  });

  it('is not ready while a test is failing', async () => {
    const { owner, project, run, release, testCases } = await setUpRelease();

    await recordTestResult(prisma, owner, project.id, run.id, testCases[0]!.id, {
      status: 'PASSED',
    });
    await recordTestResult(prisma, owner, project.id, run.id, testCases[1]!.id, {
      status: 'FAILED',
    });

    const detail = await getRelease(prisma, owner, project.id, release.id);

    expect(detail.quality.readiness).toBe('NOT_READY');
    expect(detail.quality.blockers).toContain('1 test is failing');
  });

  it('is not ready while a critical defect from its runs is unresolved', async () => {
    const { owner, project, run, release, testCases } = await setUpRelease();

    for (const testCase of testCases) {
      await recordTestResult(prisma, owner, project.id, run.id, testCase.id, { status: 'PASSED' });
    }

    await createDefect(prisma, owner, project.id, {
      title: 'Data loss on checkout',
      severity: 'CRITICAL',
      testCaseId: null,
      testRunId: run.id,
      assignedToId: null,
    });

    const detail = await getRelease(prisma, owner, project.id, release.id);

    expect(detail.quality.readiness).toBe('NOT_READY');
    expect(detail.quality.blockers).toContain('1 critical defect is still unresolved');
  });

  it('becomes ready once that defect has been verified', async () => {
    const { owner, project, run, release, testCases } = await setUpRelease();

    for (const testCase of testCases) {
      await recordTestResult(prisma, owner, project.id, run.id, testCase.id, { status: 'PASSED' });
    }

    const defect = await createDefect(prisma, owner, project.id, {
      title: 'Data loss on checkout',
      severity: 'CRITICAL',
      testCaseId: null,
      testRunId: run.id,
      assignedToId: null,
    });

    await updateDefect(prisma, owner, project.id, defect.id, {
      title: defect.title,
      severity: 'CRITICAL',
      status: 'VERIFIED',
      testCaseId: null,
      testRunId: run.id,
      assignedToId: null,
    });

    expect((await getRelease(prisma, owner, project.id, release.id)).quality.readiness).toBe(
      'READY',
    );
  });

  it('counts only the defects from its own runs', async () => {
    const { owner, project, run, release, testCases } = await setUpRelease();

    for (const testCase of testCases) {
      await recordTestResult(prisma, owner, project.id, run.id, testCase.id, { status: 'PASSED' });
    }

    const otherRun = await createTestRun(prisma, owner, project.id, { name: 'Unrelated run' });

    await createDefect(prisma, owner, project.id, {
      title: 'Critical, but not from this release',
      severity: 'CRITICAL',
      testCaseId: null,
      testRunId: otherRun.id,
      assignedToId: null,
    });

    expect((await getRelease(prisma, owner, project.id, release.id)).quality.readiness).toBe(
      'READY',
    );
  });
});

describe('choosing which runs validate a release', () => {
  it('replaces the whole set rather than adding to it', async () => {
    const { owner, project, release } = await setUpRelease();
    const second = await createTestRun(prisma, owner, project.id, { name: 'Smoke' });

    await setReleaseTestRuns(prisma, owner, project.id, release.id, { testRunIds: [second.id] });

    const detail = await getRelease(prisma, owner, project.id, release.id);

    expect(detail.testRuns.map((testRun) => testRun.name)).toEqual(['Smoke']);
  });

  it('can be emptied', async () => {
    const { owner, project, release } = await setUpRelease();

    await setReleaseTestRuns(prisma, owner, project.id, release.id, { testRunIds: [] });

    expect((await getRelease(prisma, owner, project.id, release.id)).testRuns).toEqual([]);
  });

  it('refuses a run from another project', async () => {
    const { owner, project, release } = await setUpRelease();
    const stranger = await createTestUser(prisma);
    const theirProject = await createTestProject(prisma, stranger, 'Theirs');
    const theirRun = await createTestRun(prisma, stranger, theirProject.id, { name: 'Theirs' });

    await expect(
      setReleaseTestRuns(prisma, owner, project.id, release.id, { testRunIds: [theirRun.id] }),
    ).rejects.toThrow(ValidationError);
  });

  it('leaves the run itself alone when the release is deleted', async () => {
    const { owner, project, run, release } = await setUpRelease();

    await prisma.release.delete({ where: { id: release.id } });

    const stillThere = await prisma.testRun.findUnique({ where: { id: run.id } });

    expect(stillThere?.releaseId).toBeNull();
  });
});

describe('who may do what with releases', () => {
  it('is readable by everybody in the project', async () => {
    const { project, release } = await setUpRelease();
    const developer = await createTestUser(prisma);
    await addTestMember(prisma, project.id, developer, 'DEVELOPER');

    await expect(getRelease(prisma, developer, project.id, release.id)).resolves.toMatchObject({
      version: 'v1.4.0',
    });
  });

  it('is not planned by a tester', async () => {
    const { project } = await setUpRelease();
    const tester = await createTestUser(prisma);
    await addTestMember(prisma, project.id, tester, 'QA');

    await expect(createRelease(prisma, tester, project.id, { ...RELEASE })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('is planned by a project manager', async () => {
    const { project } = await setUpRelease();
    const manager = await createTestUser(prisma);
    await addTestMember(prisma, project.id, manager, 'PROJECT_MANAGER');

    await expect(
      createRelease(prisma, manager, project.id, { ...RELEASE, version: 'v1.5.0' }),
    ).resolves.toMatchObject({ id: expect.any(String) });
  });

  it('is not reachable from another project', async () => {
    const { release } = await setUpRelease();
    const stranger = await createTestUser(prisma);
    const theirProject = await createTestProject(prisma, stranger, 'Theirs');

    await expect(getRelease(prisma, stranger, theirProject.id, release.id)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('listReleases', () => {
  it('carries the quality of each release, so the list is readable at a glance', async () => {
    const { owner, project, run, release, testCases } = await setUpRelease();

    await recordTestResult(prisma, owner, project.id, run.id, testCases[0]!.id, {
      status: 'FAILED',
    });

    const listed = await listReleases(prisma, owner, project.id);

    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(release.id);
    expect(listed[0]?.quality.readiness).toBe('NOT_READY');
  });
});

describe('updateRelease', () => {
  it('keeps the target date it was given', async () => {
    const { owner, project, release } = await setUpRelease();

    await updateRelease(prisma, owner, project.id, release.id, {
      ...RELEASE,
      status: 'RELEASED',
      targetDate: '2026-10-01',
    });

    const detail = await getRelease(prisma, owner, project.id, release.id);

    expect(detail.status).toBe('RELEASED');
    expect(detail.targetDate?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });
});
