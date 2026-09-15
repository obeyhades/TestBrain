import type { DefectSeverity, DefectStatus } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import type { AuthenticatedUser } from '../auth/auth.service.js';
import { requireProjectRole } from '../projects/project.service.js';
import * as defectRepository from './defect.repository.js';
import type { CreateDefectInput, UpdateDefectInput } from './defect.schema.js';

export type Defect = {
  id: string;
  title: string;
  description: string | null;
  severity: DefectSeverity;
  status: DefectStatus;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  environment: string | null;
  testCase: { id: string; title: string } | null;
  testRun: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  createdAt: Date;
};

function toDefect(defect: Defect): Defect {
  return {
    id: defect.id,
    title: defect.title,
    description: defect.description,
    severity: defect.severity,
    status: defect.status,
    stepsToReproduce: defect.stepsToReproduce,
    expectedResult: defect.expectedResult,
    actualResult: defect.actualResult,
    environment: defect.environment,
    testCase: defect.testCase,
    testRun: defect.testRun,
    assignedTo: defect.assignedTo,
    createdBy: defect.createdBy,
    createdAt: defect.createdAt,
  };
}

/**
 * There is no canReportDefects.
 *
 * Anybody in the project may report a defect and move it along, developers
 * included -- they are the ones fixing them. Membership is the whole permission,
 * so a function that always returned true would only be noise.
 *
 * Defects are records rather than drafts, so there is no delete. A defect that
 * turned out to be nothing gets closed, which keeps the history honest.
 */

/** Everything a defect points at has to live in the same project. */
async function requireLinksInProject(
  prisma: PrismaClient,
  projectId: string,
  input: { testCaseId: string | null; testRunId: string | null; assignedToId: string | null },
): Promise<void> {
  if (input.testCaseId !== null) {
    const testCase = await defectRepository.findTestCaseInProject(
      prisma,
      projectId,
      input.testCaseId,
    );

    if (testCase === null) {
      throw new ValidationError('That test case does not belong to this project');
    }
  }

  if (input.testRunId !== null) {
    const testRun = await defectRepository.findTestRunInProject(prisma, projectId, input.testRunId);

    if (testRun === null) {
      throw new ValidationError('That test run does not belong to this project');
    }
  }

  if (input.assignedToId !== null) {
    const member = await defectRepository.findProjectMember(prisma, projectId, input.assignedToId);

    if (member === null) {
      throw new ValidationError('You can only assign a defect to a member of this project');
    }
  }
}

export async function listDefects(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
): Promise<Defect[]> {
  await requireProjectRole(prisma, projectId, user.id);

  const defects = await defectRepository.findDefectsForProject(prisma, projectId);

  return defects.map(toDefect);
}

export async function getDefect(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  defectId: string,
): Promise<Defect> {
  await requireProjectRole(prisma, projectId, user.id);

  const defect = await defectRepository.findDefectInProject(prisma, projectId, defectId);

  if (defect === null) {
    throw new NotFoundError('Defect not found');
  }

  return toDefect(defect);
}

export async function createDefect(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  input: CreateDefectInput,
): Promise<Defect> {
  await requireProjectRole(prisma, projectId, user.id);
  await requireLinksInProject(prisma, projectId, input);

  const defect = await defectRepository.createDefect(prisma, {
    projectId,
    createdById: user.id,
    title: input.title,
    description: input.description ?? null,
    severity: input.severity,
    stepsToReproduce: input.stepsToReproduce ?? null,
    expectedResult: input.expectedResult ?? null,
    actualResult: input.actualResult ?? null,
    environment: input.environment ?? null,
    testCaseId: input.testCaseId,
    testRunId: input.testRunId,
    assignedToId: input.assignedToId,
  });

  return toDefect(defect);
}

export async function updateDefect(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  defectId: string,
  input: UpdateDefectInput,
): Promise<Defect> {
  await requireProjectRole(prisma, projectId, user.id);
  await getDefect(prisma, user, projectId, defectId);
  await requireLinksInProject(prisma, projectId, input);

  const defect = await defectRepository.updateDefect(prisma, defectId, {
    title: input.title,
    description: input.description ?? null,
    severity: input.severity,
    status: input.status,
    stepsToReproduce: input.stepsToReproduce ?? null,
    expectedResult: input.expectedResult ?? null,
    actualResult: input.actualResult ?? null,
    environment: input.environment ?? null,
    testCaseId: input.testCaseId,
    testRunId: input.testRunId,
    assignedToId: input.assignedToId,
  });

  return toDefect(defect);
}
