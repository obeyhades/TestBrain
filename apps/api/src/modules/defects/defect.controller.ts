import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '../../database/prisma.js';
import { getAuthenticatedUser } from '../../middleware/requireAuth.js';
import { createDefectSchema, updateDefectSchema } from './defect.schema.js';
import { createDefect, getDefect, listDefects, updateDefect } from './defect.service.js';

export type DefectDependencies = {
  prisma: PrismaClient;
};

const projectParams = z.object({ projectId: z.string().min(1) });
const defectParams = projectParams.extend({ defectId: z.string().min(1) });

export async function listDefectsController(
  deps: DefectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParams.parse(request.params);

  return reply.status(200).send({ defects: await listDefects(deps.prisma, user, projectId) });
}

export async function getDefectController(
  deps: DefectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, defectId } = defectParams.parse(request.params);

  return reply
    .status(200)
    .send({ defect: await getDefect(deps.prisma, user, projectId, defectId) });
}

export async function createDefectController(
  deps: DefectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParams.parse(request.params);
  const input = createDefectSchema.parse(request.body);

  return reply
    .status(201)
    .send({ defect: await createDefect(deps.prisma, user, projectId, input) });
}

export async function updateDefectController(
  deps: DefectDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, defectId } = defectParams.parse(request.params);
  const input = updateDefectSchema.parse(request.body);

  return reply
    .status(200)
    .send({ defect: await updateDefect(deps.prisma, user, projectId, defectId, input) });
}
