import type { ReleaseStatus } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';

/** Database queries for releases. Every lookup is scoped by projectId as well as id. */

export function findReleasesForProject(prisma: PrismaClient, projectId: string) {
  return prisma.release.findMany({
    where: { projectId },
    include: { testRuns: { select: { results: { select: { status: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function findReleaseInProject(prisma: PrismaClient, projectId: string, releaseId: string) {
  return prisma.release.findFirst({
    where: { id: releaseId, projectId },
    include: {
      testRuns: {
        select: { id: true, name: true, results: { select: { status: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

type ReleaseFields = {
  name: string;
  version: string;
  description: string | null;
  status: ReleaseStatus;
  targetDate: Date | null;
};

export function createRelease(
  prisma: PrismaClient,
  data: ReleaseFields & { projectId: string; createdById: string },
) {
  return prisma.release.create({ data });
}

export function updateRelease(prisma: PrismaClient, releaseId: string, data: ReleaseFields) {
  return prisma.release.update({ where: { id: releaseId }, data });
}

/**
 * Points exactly the given runs at this release, and no others.
 *
 * Two statements in a transaction: detach everything currently attached, then
 * attach the chosen ones. The same "send the list you want" idea as test steps.
 */
export function setReleaseTestRuns(
  prisma: PrismaClient,
  projectId: string,
  releaseId: string,
  testRunIds: string[],
) {
  return prisma.$transaction([
    prisma.testRun.updateMany({ where: { releaseId }, data: { releaseId: null } }),
    prisma.testRun.updateMany({
      where: { projectId, id: { in: testRunIds } },
      data: { releaseId },
    }),
  ]);
}

export function findTestRunIdsInProject(
  prisma: PrismaClient,
  projectId: string,
  testRunIds: string[],
) {
  return prisma.testRun.findMany({
    where: { projectId, id: { in: testRunIds } },
    select: { id: true },
  });
}

/**
 * The defects a release has to answer for: everything reported against the test
 * runs that validated it.
 */
export function findDefectsForRelease(prisma: PrismaClient, releaseId: string) {
  return prisma.defect.findMany({
    where: { testRun: { releaseId } },
    select: { id: true, title: true, severity: true, status: true },
  });
}
