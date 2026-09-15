import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '../../database/prisma.js';
import { getAuthenticatedUser } from '../../middleware/requireAuth.js';
import {
  addProjectMemberSchema,
  createProjectSchema,
  updateProjectMemberRoleSchema,
  updateProjectSchema,
} from './project.schema.js';
import {
  createProject,
  getProject,
  listProjectsForUser,
  updateProject,
} from './project.service.js';
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  updateProjectMemberRole,
} from './projectMember.service.js';

export type ProjectDependencies = {
  prisma: PrismaClient;
};

const projectParamsSchema = z.object({ projectId: z.string().min(1) });

const memberParamsSchema = projectParamsSchema.extend({ userId: z.string().min(1) });

export async function listProjectsController(
  deps: ProjectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);

  return reply.status(200).send({ projects: await listProjectsForUser(deps.prisma, user) });
}

export async function createProjectController(
  deps: ProjectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const input = createProjectSchema.parse(request.body);

  return reply.status(201).send({ project: await createProject(deps.prisma, user, input) });
}

export async function getProjectController(
  deps: ProjectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParamsSchema.parse(request.params);

  return reply.status(200).send({ project: await getProject(deps.prisma, user, projectId) });
}

export async function updateProjectController(
  deps: ProjectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParamsSchema.parse(request.params);
  const input = updateProjectSchema.parse(request.body);

  return reply
    .status(200)
    .send({ project: await updateProject(deps.prisma, user, projectId, input) });
}

export async function listProjectMembersController(
  deps: ProjectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParamsSchema.parse(request.params);

  return reply
    .status(200)
    .send({ members: await listProjectMembers(deps.prisma, user, projectId) });
}

export async function addProjectMemberController(
  deps: ProjectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParamsSchema.parse(request.params);
  const input = addProjectMemberSchema.parse(request.body);

  return reply
    .status(201)
    .send({ member: await addProjectMember(deps.prisma, user, projectId, input) });
}

export async function updateProjectMemberRoleController(
  deps: ProjectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, userId } = memberParamsSchema.parse(request.params);
  const input = updateProjectMemberRoleSchema.parse(request.body);

  return reply
    .status(200)
    .send({ member: await updateProjectMemberRole(deps.prisma, user, projectId, userId, input) });
}

export async function removeProjectMemberController(
  deps: ProjectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, userId } = memberParamsSchema.parse(request.params);

  await removeProjectMember(deps.prisma, user, projectId, userId);

  return reply.status(204).send();
}
