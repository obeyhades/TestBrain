import type { RequirementStatus } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { AuthenticatedUser } from '../auth/auth.service.js';
import { canEditRequirements } from '../projects/permissions.js';
import { requireProjectRole } from '../projects/project.service.js';
import * as requirementRepository from './requirement.repository.js';
import type { CreateRequirementInput, UpdateRequirementInput } from './requirement.schema.js';

export type Requirement = {
  id: string;
  title: string;
  description: string | null;
  status: RequirementStatus;
  createdAt: Date;
};

function toRequirement(requirement: Requirement): Requirement {
  return {
    id: requirement.id,
    title: requirement.title,
    description: requirement.description,
    status: requirement.status,
    createdAt: requirement.createdAt,
  };
}

/**
 * Checks that the caller may change this project's requirements.
 *
 * Membership is checked first, so somebody outside the project is told it does not
 * exist rather than that they lack a role in it.
 */
async function requireEditAccess(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
): Promise<void> {
  const role = await requireProjectRole(prisma, projectId, user.id);

  if (!canEditRequirements(role)) {
    throw new ForbiddenError('You do not have permission to change requirements');
  }
}

/** Anybody in the project can read its requirements, developers included. */
export async function listRequirements(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
): Promise<Requirement[]> {
  await requireProjectRole(prisma, projectId, user.id);

  const requirements = await requirementRepository.findRequirementsForProject(prisma, projectId);

  return requirements.map(toRequirement);
}

export async function getRequirement(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  requirementId: string,
): Promise<Requirement> {
  await requireProjectRole(prisma, projectId, user.id);

  const requirement = await requirementRepository.findRequirementInProject(
    prisma,
    projectId,
    requirementId,
  );

  if (requirement === null) {
    throw new NotFoundError('Requirement not found');
  }

  return toRequirement(requirement);
}

export async function createRequirement(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  input: CreateRequirementInput,
): Promise<Requirement> {
  await requireEditAccess(prisma, user, projectId);

  const requirement = await requirementRepository.createRequirement(prisma, {
    projectId,
    title: input.title,
    description: input.description ?? null,
    status: input.status,
    createdById: user.id,
  });

  return toRequirement(requirement);
}

export async function updateRequirement(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  requirementId: string,
  input: UpdateRequirementInput,
): Promise<Requirement> {
  await requireEditAccess(prisma, user, projectId);

  // Confirms the requirement belongs to the project the caller has access to,
  // rather than trusting the id in the URL.
  await getRequirementOrFail(prisma, projectId, requirementId);

  const requirement = await requirementRepository.updateRequirement(prisma, requirementId, {
    title: input.title,
    description: input.description ?? null,
    status: input.status,
  });

  return toRequirement(requirement);
}

export async function deleteRequirement(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  requirementId: string,
): Promise<void> {
  await requireEditAccess(prisma, user, projectId);

  await getRequirementOrFail(prisma, projectId, requirementId);

  await requirementRepository.deleteRequirement(prisma, requirementId);
}

async function getRequirementOrFail(
  prisma: PrismaClient,
  projectId: string,
  requirementId: string,
): Promise<void> {
  const requirement = await requirementRepository.findRequirementInProject(
    prisma,
    projectId,
    requirementId,
  );

  if (requirement === null) {
    throw new NotFoundError('Requirement not found');
  }
}
