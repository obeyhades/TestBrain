import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '../../database/prisma.js';
import { getAuthenticatedUser } from '../../middleware/requireAuth.js';
import { createRequirementSchema, updateRequirementSchema } from './requirement.schema.js';
import {
  createRequirement,
  deleteRequirement,
  getRequirement,
  listRequirements,
  updateRequirement,
} from './requirement.service.js';

export type RequirementDependencies = {
  prisma: PrismaClient;
};

const projectParamsSchema = z.object({ projectId: z.string().min(1) });

const requirementParamsSchema = projectParamsSchema.extend({
  requirementId: z.string().min(1),
});

export async function listRequirementsController(
  deps: RequirementDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParamsSchema.parse(request.params);

  return reply
    .status(200)
    .send({ requirements: await listRequirements(deps.prisma, user, projectId) });
}

export async function getRequirementController(
  deps: RequirementDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, requirementId } = requirementParamsSchema.parse(request.params);

  return reply.status(200).send({
    requirement: await getRequirement(deps.prisma, user, projectId, requirementId),
  });
}

export async function createRequirementController(
  deps: RequirementDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParamsSchema.parse(request.params);
  const input = createRequirementSchema.parse(request.body);

  return reply.status(201).send({
    requirement: await createRequirement(deps.prisma, user, projectId, input),
  });
}

export async function updateRequirementController(
  deps: RequirementDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, requirementId } = requirementParamsSchema.parse(request.params);
  const input = updateRequirementSchema.parse(request.body);

  return reply.status(200).send({
    requirement: await updateRequirement(deps.prisma, user, projectId, requirementId, input),
  });
}

export async function deleteRequirementController(
  deps: RequirementDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, requirementId } = requirementParamsSchema.parse(request.params);

  await deleteRequirement(deps.prisma, user, projectId, requirementId);

  return reply.status(204).send();
}
