import type { ProjectRole } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { AuthenticatedUser } from '../auth/auth.service.js';
import { canManageProject } from './permissions.js';
import * as projectRepository from './project.repository.js';
import type { CreateProjectInput, UpdateProjectInput } from './project.schema.js';

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
};

function toProjectSummary(project: ProjectSummary): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
  };
}

/**
 * The single gate every project operation goes through.
 *
 * Somebody who is not a member is told the project does not exist rather than that
 * they are not allowed to see it, because a 403 would confirm which project ids
 * are real.
 *
 * This is one function precisely because forgetting it is the bug that matters: a
 * service function that skips it exposes another team data.
 */
export async function requireProjectRole(
  prisma: PrismaClient,
  projectId: string,
  userId: string,
): Promise<ProjectRole> {
  const membership = await projectRepository.findMemberRole(prisma, projectId, userId);

  if (membership === null) {
    throw new NotFoundError('Project not found');
  }

  return membership.role;
}

/** Anybody signed in may start a project, and becomes its administrator. */
export async function createProject(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  input: CreateProjectInput,
): Promise<ProjectSummary> {
  const project = await projectRepository.createProjectWithOwner(prisma, {
    name: input.name,
    description: input.description ?? null,
    createdById: user.id,
  });

  return toProjectSummary(project);
}

export async function listProjectsForUser(
  prisma: PrismaClient,
  user: AuthenticatedUser,
): Promise<ProjectSummary[]> {
  const projects = await projectRepository.findProjectsForUser(prisma, user.id);

  return projects.map(toProjectSummary);
}

export async function getProject(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
): Promise<ProjectSummary> {
  await requireProjectRole(prisma, projectId, user.id);

  const project = await projectRepository.findProjectById(prisma, projectId);

  if (project === null) {
    throw new NotFoundError('Project not found');
  }

  return toProjectSummary(project);
}

export async function updateProject(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectSummary> {
  const role = await requireProjectRole(prisma, projectId, user.id);

  if (!canManageProject(role)) {
    throw new ForbiddenError('You do not have permission to change this project');
  }

  const project = await projectRepository.updateProject(prisma, projectId, {
    name: input.name,
    description: input.description ?? null,
  });

  return toProjectSummary(project);
}
