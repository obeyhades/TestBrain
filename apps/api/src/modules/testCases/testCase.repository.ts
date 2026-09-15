import type { Priority } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';
import type { NumberedTestStep } from './testStep.logic.js';

/**
 * Database queries for test cases. Every lookup is scoped by projectId as well as
 * by id, so a test case id from another project is not a key to it.
 */

const WITH_STEPS = {
  steps: { orderBy: { position: 'asc' } },
} as const;

export function findTestCasesForProject(prisma: PrismaClient, projectId: string) {
  return prisma.testCase.findMany({
    where: { projectId },
    include: { requirement: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function findTestCaseInProject(prisma: PrismaClient, projectId: string, testCaseId: string) {
  return prisma.testCase.findFirst({
    where: { id: testCaseId, projectId },
    include: { ...WITH_STEPS, requirement: { select: { id: true, title: true } } },
  });
}

export function findRequirementInProject(
  prisma: PrismaClient,
  projectId: string,
  requirementId: string,
) {
  return prisma.requirement.findFirst({ where: { id: requirementId, projectId } });
}

type TestCaseFields = {
  title: string;
  description: string | null;
  preconditions: string | null;
  priority: Priority;
  requirementId: string | null;
};

export function createTestCaseWithSteps(
  prisma: PrismaClient,
  data: TestCaseFields & { projectId: string; createdById: string; steps: NumberedTestStep[] },
) {
  const { steps, ...testCase } = data;

  return prisma.testCase.create({
    data: { ...testCase, steps: { create: steps } },
    include: { ...WITH_STEPS, requirement: { select: { id: true, title: true } } },
  });
}

/**
 * Saves the test case and replaces its steps with the list given.
 *
 * Deleting and recreating the steps keeps this one operation instead of working
 * out which steps moved, which are new and which are gone. A transaction means the
 * test case is never left without its steps if something fails halfway.
 */
export function updateTestCaseWithSteps(
  prisma: PrismaClient,
  testCaseId: string,
  data: TestCaseFields & { steps: NumberedTestStep[] },
) {
  const { steps, ...testCase } = data;

  return prisma.$transaction(async (tx) => {
    await tx.testStep.deleteMany({ where: { testCaseId } });

    return tx.testCase.update({
      where: { id: testCaseId },
      data: { ...testCase, steps: { create: steps } },
      include: { ...WITH_STEPS, requirement: { select: { id: true, title: true } } },
    });
  });
}

export function deleteTestCase(prisma: PrismaClient, testCaseId: string) {
  return prisma.testCase.delete({ where: { id: testCaseId } });
}
