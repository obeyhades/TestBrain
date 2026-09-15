import type { Priority } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors.js';
import type { AuthenticatedUser } from '../auth/auth.service.js';
import { canEditTestCases } from '../projects/permissions.js';
import { requireProjectRole } from '../projects/project.service.js';
import * as testCaseRepository from './testCase.repository.js';
import { numberTestSteps } from './testStep.logic.js';
import type { CreateTestCaseInput, UpdateTestCaseInput } from './testCase.schema.js';

export type TestCaseSummary = {
  id: string;
  title: string;
  priority: Priority;
  requirement: { id: string; title: string } | null;
};

export type TestCaseDetail = TestCaseSummary & {
  description: string | null;
  preconditions: string | null;
  steps: { position: number; action: string; expectedResult: string }[];
};

type TestCaseRecord = {
  id: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  priority: Priority;
  requirement: { id: string; title: string } | null;
  steps: { position: number; action: string; expectedResult: string }[];
};

function toDetail(testCase: TestCaseRecord): TestCaseDetail {
  return {
    id: testCase.id,
    title: testCase.title,
    description: testCase.description,
    preconditions: testCase.preconditions,
    priority: testCase.priority,
    requirement: testCase.requirement,
    steps: testCase.steps.map((step) => ({
      position: step.position,
      action: step.action,
      expectedResult: step.expectedResult,
    })),
  };
}

async function requireEditAccess(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
): Promise<void> {
  const role = await requireProjectRole(prisma, projectId, user.id);

  if (!canEditTestCases(role)) {
    throw new ForbiddenError('You do not have permission to change test cases');
  }
}

/**
 * A test case may only point at a requirement in its own project. Without this,
 * the link itself would be a way to find out that another project's requirement
 * exists.
 */
async function requireRequirementInProject(
  prisma: PrismaClient,
  projectId: string,
  requirementId: string | null,
): Promise<void> {
  if (requirementId === null) {
    return;
  }

  const requirement = await testCaseRepository.findRequirementInProject(
    prisma,
    projectId,
    requirementId,
  );

  if (requirement === null) {
    throw new ValidationError('That requirement does not belong to this project');
  }
}

export async function listTestCases(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
): Promise<TestCaseSummary[]> {
  await requireProjectRole(prisma, projectId, user.id);

  const testCases = await testCaseRepository.findTestCasesForProject(prisma, projectId);

  return testCases.map((testCase) => ({
    id: testCase.id,
    title: testCase.title,
    priority: testCase.priority,
    requirement: testCase.requirement,
  }));
}

export async function getTestCase(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  testCaseId: string,
): Promise<TestCaseDetail> {
  await requireProjectRole(prisma, projectId, user.id);

  const testCase = await testCaseRepository.findTestCaseInProject(prisma, projectId, testCaseId);

  if (testCase === null) {
    throw new NotFoundError('Test case not found');
  }

  return toDetail(testCase);
}

export async function createTestCase(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  input: CreateTestCaseInput,
): Promise<TestCaseDetail> {
  await requireEditAccess(prisma, user, projectId);
  await requireRequirementInProject(prisma, projectId, input.requirementId);

  const testCase = await testCaseRepository.createTestCaseWithSteps(prisma, {
    projectId,
    createdById: user.id,
    title: input.title,
    description: input.description ?? null,
    preconditions: input.preconditions ?? null,
    priority: input.priority,
    requirementId: input.requirementId,
    steps: numberTestSteps(input.steps),
  });

  return toDetail(testCase);
}

export async function updateTestCase(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  testCaseId: string,
  input: UpdateTestCaseInput,
): Promise<TestCaseDetail> {
  await requireEditAccess(prisma, user, projectId);
  await requireTestCaseInProject(prisma, projectId, testCaseId);
  await requireRequirementInProject(prisma, projectId, input.requirementId);

  const testCase = await testCaseRepository.updateTestCaseWithSteps(prisma, testCaseId, {
    title: input.title,
    description: input.description ?? null,
    preconditions: input.preconditions ?? null,
    priority: input.priority,
    requirementId: input.requirementId,
    steps: numberTestSteps(input.steps),
  });

  return toDetail(testCase);
}

export async function deleteTestCase(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  testCaseId: string,
): Promise<void> {
  await requireEditAccess(prisma, user, projectId);
  await requireTestCaseInProject(prisma, projectId, testCaseId);

  await testCaseRepository.deleteTestCase(prisma, testCaseId);
}

async function requireTestCaseInProject(
  prisma: PrismaClient,
  projectId: string,
  testCaseId: string,
): Promise<void> {
  const testCase = await testCaseRepository.findTestCaseInProject(prisma, projectId, testCaseId);

  if (testCase === null) {
    throw new NotFoundError('Test case not found');
  }
}
