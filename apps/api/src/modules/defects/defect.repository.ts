import type { DefectSeverity, DefectStatus } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';

/** Database queries for defects. Every lookup is scoped by projectId as well as id. */

const WITH_LINKS = {
  testCase: { select: { id: true, title: true } },
  testRun: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

export function findDefectsForProject(prisma: PrismaClient, projectId: string) {
  return prisma.defect.findMany({
    where: { projectId },
    include: WITH_LINKS,
    orderBy: { createdAt: 'desc' },
  });
}

export function findDefectInProject(prisma: PrismaClient, projectId: string, defectId: string) {
  return prisma.defect.findFirst({ where: { id: defectId, projectId }, include: WITH_LINKS });
}

type DefectFields = {
  title: string;
  description: string | null;
  severity: DefectSeverity;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  environment: string | null;
  testCaseId: string | null;
  testRunId: string | null;
  assignedToId: string | null;
};

export function createDefect(
  prisma: PrismaClient,
  data: DefectFields & { projectId: string; createdById: string },
) {
  return prisma.defect.create({ data, include: WITH_LINKS });
}

export function updateDefect(
  prisma: PrismaClient,
  defectId: string,
  data: DefectFields & { status: DefectStatus },
) {
  return prisma.defect.update({ where: { id: defectId }, data, include: WITH_LINKS });
}

/** Used to check that everything a defect points at belongs to the same project. */
export function findTestCaseInProject(prisma: PrismaClient, projectId: string, testCaseId: string) {
  return prisma.testCase.findFirst({ where: { id: testCaseId, projectId } });
}

export function findTestRunInProject(prisma: PrismaClient, projectId: string, testRunId: string) {
  return prisma.testRun.findFirst({ where: { id: testRunId, projectId } });
}

export function findProjectMember(prisma: PrismaClient, projectId: string, userId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}
