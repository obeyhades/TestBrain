import type { DefectSeverity, DefectStatus, ReleaseStatus } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors.js';
import type { AuthenticatedUser } from '../auth/auth.service.js';
import { canManageReleases } from '../projects/permissions.js';
import { requireProjectRole } from '../projects/project.service.js';
import * as releaseRepository from './release.repository.js';
import { determineReleaseQuality, type ReleaseQuality } from './release.logic.js';
import type {
  CreateReleaseInput,
  SetReleaseTestRunsInput,
  UpdateReleaseInput,
} from './release.schema.js';

export type ReleaseListItem = {
  id: string;
  name: string;
  version: string;
  status: ReleaseStatus;
  targetDate: Date | null;
  quality: ReleaseQuality;
};

export type ReleaseDetail = ReleaseListItem & {
  description: string | null;
  testRuns: { id: string; name: string }[];
  defects: { id: string; title: string; severity: DefectSeverity; status: DefectStatus }[];
};

/** Turns the YYYY-MM-DD the form sends into a date, or nothing. */
function toTargetDate(value: string | null): Date | null {
  return value === null ? null : new Date(`${value}T00:00:00.000Z`);
}

async function requireReleaseAccess(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
): Promise<void> {
  const role = await requireProjectRole(prisma, projectId, user.id);

  if (!canManageReleases(role)) {
    throw new ForbiddenError('You do not have permission to manage releases');
  }
}

export async function listReleases(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
): Promise<ReleaseListItem[]> {
  await requireProjectRole(prisma, projectId, user.id);

  const releases = await releaseRepository.findReleasesForProject(prisma, projectId);

  return Promise.all(
    releases.map(async (release) => ({
      id: release.id,
      name: release.name,
      version: release.version,
      status: release.status,
      targetDate: release.targetDate,
      quality: determineReleaseQuality({
        results: release.testRuns.flatMap((testRun) => testRun.results),
        defects: await releaseRepository.findDefectsForRelease(prisma, release.id),
      }),
    })),
  );
}

export async function getRelease(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  releaseId: string,
): Promise<ReleaseDetail> {
  await requireProjectRole(prisma, projectId, user.id);

  const release = await releaseRepository.findReleaseInProject(prisma, projectId, releaseId);

  if (release === null) {
    throw new NotFoundError('Release not found');
  }

  const defects = await releaseRepository.findDefectsForRelease(prisma, release.id);

  return {
    id: release.id,
    name: release.name,
    version: release.version,
    description: release.description,
    status: release.status,
    targetDate: release.targetDate,
    testRuns: release.testRuns.map((testRun) => ({ id: testRun.id, name: testRun.name })),
    defects,
    quality: determineReleaseQuality({
      results: release.testRuns.flatMap((testRun) => testRun.results),
      defects,
    }),
  };
}

export async function createRelease(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  input: CreateReleaseInput,
): Promise<{ id: string }> {
  await requireReleaseAccess(prisma, user, projectId);

  const release = await releaseRepository.createRelease(prisma, {
    projectId,
    createdById: user.id,
    name: input.name,
    version: input.version,
    description: input.description ?? null,
    status: input.status,
    targetDate: toTargetDate(input.targetDate),
  });

  return { id: release.id };
}

export async function updateRelease(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  releaseId: string,
  input: UpdateReleaseInput,
): Promise<void> {
  await requireReleaseAccess(prisma, user, projectId);
  await requireRelease(prisma, projectId, releaseId);

  await releaseRepository.updateRelease(prisma, releaseId, {
    name: input.name,
    version: input.version,
    description: input.description ?? null,
    status: input.status,
    targetDate: toTargetDate(input.targetDate),
  });
}

export async function setReleaseTestRuns(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  releaseId: string,
  input: SetReleaseTestRunsInput,
): Promise<void> {
  await requireReleaseAccess(prisma, user, projectId);
  await requireRelease(prisma, projectId, releaseId);

  const found = await releaseRepository.findTestRunIdsInProject(
    prisma,
    projectId,
    input.testRunIds,
  );

  if (found.length !== input.testRunIds.length) {
    throw new ValidationError('Some of those test runs do not belong to this project');
  }

  await releaseRepository.setReleaseTestRuns(prisma, projectId, releaseId, input.testRunIds);
}

async function requireRelease(
  prisma: PrismaClient,
  projectId: string,
  releaseId: string,
): Promise<void> {
  const release = await releaseRepository.findReleaseInProject(prisma, projectId, releaseId);

  if (release === null) {
    throw new NotFoundError('Release not found');
  }
}
