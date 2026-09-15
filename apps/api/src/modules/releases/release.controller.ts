import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '../../database/prisma.js';
import { getAuthenticatedUser } from '../../middleware/requireAuth.js';
import {
  createReleaseSchema,
  setReleaseTestRunsSchema,
  updateReleaseSchema,
} from './release.schema.js';
import {
  createRelease,
  getRelease,
  listReleases,
  setReleaseTestRuns,
  updateRelease,
} from './release.service.js';

export type ReleaseDependencies = {
  prisma: PrismaClient;
};

const projectParams = z.object({ projectId: z.string().min(1) });
const releaseParams = projectParams.extend({ releaseId: z.string().min(1) });

export async function listReleasesController(
  deps: ReleaseDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParams.parse(request.params);

  return reply.status(200).send({ releases: await listReleases(deps.prisma, user, projectId) });
}

export async function getReleaseController(
  deps: ReleaseDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, releaseId } = releaseParams.parse(request.params);

  return reply
    .status(200)
    .send({ release: await getRelease(deps.prisma, user, projectId, releaseId) });
}

export async function createReleaseController(
  deps: ReleaseDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParams.parse(request.params);
  const input = createReleaseSchema.parse(request.body);

  return reply
    .status(201)
    .send({ release: await createRelease(deps.prisma, user, projectId, input) });
}

export async function updateReleaseController(
  deps: ReleaseDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, releaseId } = releaseParams.parse(request.params);
  const input = updateReleaseSchema.parse(request.body);

  await updateRelease(deps.prisma, user, projectId, releaseId, input);

  return reply.status(204).send();
}

export async function setReleaseTestRunsController(
  deps: ReleaseDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, releaseId } = releaseParams.parse(request.params);
  const input = setReleaseTestRunsSchema.parse(request.body);

  await setReleaseTestRuns(deps.prisma, user, projectId, releaseId, input);

  return reply.status(204).send();
}
