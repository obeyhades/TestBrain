import type { TestResultStatus } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';

/**
 * Database queries for test runs. Every lookup is scoped by projectId as well as
 * by id, so a run id from another project is not a key to it.
 */

export function findTestRunsForProject(prisma: PrismaClient, projectId: string) {
  return prisma.testRun.findMany({
    where: { projectId },
    include: { results: { select: { status: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function findTestRunInProject(prisma: PrismaClient, projectId: string, testRunId: string) {
  return prisma.testRun.findFirst({
    where: { id: testRunId, projectId },
    include: {
      results: {
        include: {
          testCase: { select: { id: true, title: true, priority: true } },
          executedBy: { select: { name: true } },
        },
        orderBy: { testCase: { title: 'asc' } },
      },
    },
  });
}

export function createTestRun(
  prisma: PrismaClient,
  data: { projectId: string; name: string; createdById: string },
) {
  return prisma.testRun.create({ data });
}

export function setTestRunStatus(
  prisma: PrismaClient,
  testRunId: string,
  status: 'OPEN' | 'COMPLETED',
) {
  return prisma.testRun.update({ where: { id: testRunId }, data: { status } });
}

/** Only test cases that actually belong to this project can be added to its runs. */
export function findTestCaseIdsInProject(
  prisma: PrismaClient,
  projectId: string,
  testCaseIds: string[],
) {
  return prisma.testCase.findMany({
    where: { projectId, id: { in: testCaseIds } },
    select: { id: true },
  });
}

/**
 * Adds test cases to a run by creating their results, still NOT_RUN.
 *
 * skipDuplicates means adding a case that is already in the run is quietly ignored
 * rather than failing the whole batch.
 */
export function addResultsToRun(prisma: PrismaClient, testRunId: string, testCaseIds: string[]) {
  return prisma.testResult.createMany({
    data: testCaseIds.map((testCaseId) => ({ testRunId, testCaseId })),
    skipDuplicates: true,
  });
}

export function findResult(prisma: PrismaClient, testRunId: string, testCaseId: string) {
  return prisma.testResult.findUnique({
    where: { testRunId_testCaseId: { testRunId, testCaseId } },
  });
}

export function updateResult(
  prisma: PrismaClient,
  testRunId: string,
  testCaseId: string,
  data: {
    status: TestResultStatus;
    notes: string | null;
    executedById: string | null;
    executedAt: Date | null;
  },
) {
  return prisma.testResult.update({
    where: { testRunId_testCaseId: { testRunId, testCaseId } },
    data,
    include: { testCase: { select: { id: true, title: true, priority: true } } },
  });
}

export function removeResult(prisma: PrismaClient, testRunId: string, testCaseId: string) {
  return prisma.testResult.deleteMany({ where: { testRunId, testCaseId } });
}

/** Every test case in the project, by title, for matching an imported report. */
export function findTestCaseTitlesInProject(prisma: PrismaClient, projectId: string) {
  return prisma.testCase.findMany({
    where: { projectId },
    select: { id: true, title: true },
  });
}
