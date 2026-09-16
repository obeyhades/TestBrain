import type { Priority, TestResultStatus, TestRunStatus } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors.js';
import type { AuthenticatedUser } from '../auth/auth.service.js';
import { canRunTests } from '../projects/permissions.js';
import { requireProjectRole } from '../projects/project.service.js';
import * as testRunRepository from './testRun.repository.js';
import { JUnitReportError, parseJUnitReport, type ParsedTestResult } from './junitReport.js';
import { calculateTestRunSummary, type TestRunSummary } from './testRun.logic.js';
import type {
  AddTestCasesInput,
  CreateTestRunInput,
  ImportReportInput,
  RecordResultInput,
} from './testRun.schema.js';

export type TestRunListItem = {
  id: string;
  name: string;
  status: TestRunStatus;
  createdAt: Date;
  summary: TestRunSummary;
};

export type TestRunResult = {
  testCaseId: string;
  title: string;
  priority: Priority;
  status: TestResultStatus;
  notes: string | null;
  executedBy: string | null;
  executedAt: Date | null;
};

export type TestRunDetail = {
  id: string;
  name: string;
  status: TestRunStatus;
  summary: TestRunSummary;
  results: TestRunResult[];
};

async function requireRunAccess(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
): Promise<void> {
  const role = await requireProjectRole(prisma, projectId, user.id);

  if (!canRunTests(role)) {
    throw new ForbiddenError('You do not have permission to change test runs');
  }
}

async function requireTestRun(prisma: PrismaClient, projectId: string, testRunId: string) {
  const testRun = await testRunRepository.findTestRunInProject(prisma, projectId, testRunId);

  if (testRun === null) {
    throw new NotFoundError('Test run not found');
  }

  return testRun;
}

export async function listTestRuns(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
): Promise<TestRunListItem[]> {
  await requireProjectRole(prisma, projectId, user.id);

  const testRuns = await testRunRepository.findTestRunsForProject(prisma, projectId);

  return testRuns.map((testRun) => ({
    id: testRun.id,
    name: testRun.name,
    status: testRun.status,
    createdAt: testRun.createdAt,
    summary: calculateTestRunSummary(testRun.results),
  }));
}

export async function getTestRun(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  testRunId: string,
): Promise<TestRunDetail> {
  await requireProjectRole(prisma, projectId, user.id);

  const testRun = await requireTestRun(prisma, projectId, testRunId);

  return {
    id: testRun.id,
    name: testRun.name,
    status: testRun.status,
    summary: calculateTestRunSummary(testRun.results),
    results: testRun.results.map((result) => ({
      testCaseId: result.testCase.id,
      title: result.testCase.title,
      priority: result.testCase.priority,
      status: result.status,
      notes: result.notes,
      executedBy: result.executedBy?.name ?? null,
      executedAt: result.executedAt,
    })),
  };
}

export async function createTestRun(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  input: CreateTestRunInput,
): Promise<{ id: string; name: string }> {
  await requireRunAccess(prisma, user, projectId);

  const testRun = await testRunRepository.createTestRun(prisma, {
    projectId,
    name: input.name,
    createdById: user.id,
  });

  return { id: testRun.id, name: testRun.name };
}

export async function addTestCasesToRun(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  testRunId: string,
  input: AddTestCasesInput,
): Promise<void> {
  await requireRunAccess(prisma, user, projectId);
  await requireTestRun(prisma, projectId, testRunId);

  const found = await testRunRepository.findTestCaseIdsInProject(
    prisma,
    projectId,
    input.testCaseIds,
  );

  // Refuse the whole batch rather than silently adding the ones that happened to
  // belong here: a request naming another project's test case is a mistake worth
  // reporting, not something to half-carry-out.
  if (found.length !== input.testCaseIds.length) {
    throw new ValidationError('Some of those test cases do not belong to this project');
  }

  await testRunRepository.addResultsToRun(prisma, testRunId, input.testCaseIds);
}

export async function recordTestResult(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  testRunId: string,
  testCaseId: string,
  input: RecordResultInput,
): Promise<void> {
  await requireRunAccess(prisma, user, projectId);
  await requireTestRun(prisma, projectId, testRunId);

  const existing = await testRunRepository.findResult(prisma, testRunId, testCaseId);

  if (existing === null) {
    throw new NotFoundError('That test case is not part of this run');
  }

  // Putting a result back to NOT_RUN means it has not been executed, so it should
  // not keep saying who ran it and when.
  const executed = input.status !== 'NOT_RUN';

  await testRunRepository.updateResult(prisma, testRunId, testCaseId, {
    status: input.status,
    notes: input.notes ?? null,
    executedById: executed ? user.id : null,
    executedAt: executed ? new Date() : null,
  });
}

export async function removeTestCaseFromRun(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  testRunId: string,
  testCaseId: string,
): Promise<void> {
  await requireRunAccess(prisma, user, projectId);
  await requireTestRun(prisma, projectId, testRunId);

  await testRunRepository.removeResult(prisma, testRunId, testCaseId);
}

export async function setTestRunCompleted(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  testRunId: string,
  completed: boolean,
): Promise<void> {
  await requireRunAccess(prisma, user, projectId);
  await requireTestRun(prisma, projectId, testRunId);

  await testRunRepository.setTestRunStatus(prisma, testRunId, completed ? 'COMPLETED' : 'OPEN');
}

export type ImportSummary = {
  /** Results written into the run. */
  recorded: number;
  /** Test cases the report mentioned that were not in the run yet, and now are. */
  addedToRun: number;
  /** Names in the report that match no test case in this project. */
  unmatched: string[];
};

/**
 * Fills a run in from a JUnit XML report instead of by hand.
 *
 * A test in the report is matched to a test case by its exact title. That is
 * deliberately simple: name the automated test the same as the test case it
 * covers, and the two line up. Names that match nothing are reported back rather
 * than dropped, so a typo in one place shows up instead of silently losing a
 * result.
 *
 * Results written this way look exactly like results recorded by a person. The
 * summary, the release readiness and everything else treat them the same.
 */
export async function importTestResults(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  testRunId: string,
  input: ImportReportInput,
): Promise<ImportSummary> {
  await requireRunAccess(prisma, user, projectId);
  await requireTestRun(prisma, projectId, testRunId);

  let parsed;

  try {
    parsed = parseJUnitReport(input.report);
  } catch (error) {
    if (error instanceof JUnitReportError) {
      throw new ValidationError(error.message);
    }

    throw error;
  }

  const testCases = await testRunRepository.findTestCaseTitlesInProject(prisma, projectId);
  const idByTitle = new Map(testCases.map((testCase) => [testCase.title, testCase.id]));

  const matched: { testCaseId: string; result: ParsedTestResult }[] = [];
  const unmatched: string[] = [];

  for (const result of parsed) {
    const testCaseId = idByTitle.get(result.name);

    if (testCaseId === undefined) {
      unmatched.push(result.name);
    } else {
      matched.push({ testCaseId, result });
    }
  }

  const alreadyInRun = new Set(
    (await testRunRepository.findTestRunInProject(prisma, projectId, testRunId))?.results.map(
      (row) => row.testCase.id,
    ) ?? [],
  );
  const toAdd = matched
    .map((entry) => entry.testCaseId)
    .filter((testCaseId) => !alreadyInRun.has(testCaseId));

  if (toAdd.length > 0) {
    await testRunRepository.addResultsToRun(prisma, testRunId, toAdd);
  }

  const executedAt = new Date();

  for (const { testCaseId, result } of matched) {
    await testRunRepository.updateResult(prisma, testRunId, testCaseId, {
      status: result.status,
      notes: result.message,
      executedById: user.id,
      executedAt,
    });
  }

  return { recorded: matched.length, addedToRun: new Set(toAdd).size, unmatched };
}
