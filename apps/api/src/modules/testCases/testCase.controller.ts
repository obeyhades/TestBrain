import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '../../database/prisma.js';
import { getAuthenticatedUser } from '../../middleware/requireAuth.js';
import { createTestCaseSchema, updateTestCaseSchema } from './testCase.schema.js';
import {
  createTestCase,
  deleteTestCase,
  getTestCase,
  listTestCases,
  updateTestCase,
} from './testCase.service.js';

export type TestCaseDependencies = {
  prisma: PrismaClient;
};

const projectParamsSchema = z.object({ projectId: z.string().min(1) });

const testCaseParamsSchema = projectParamsSchema.extend({ testCaseId: z.string().min(1) });

export async function listTestCasesController(
  deps: TestCaseDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParamsSchema.parse(request.params);

  return reply.status(200).send({ testCases: await listTestCases(deps.prisma, user, projectId) });
}

export async function getTestCaseController(
  deps: TestCaseDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, testCaseId } = testCaseParamsSchema.parse(request.params);

  return reply
    .status(200)
    .send({ testCase: await getTestCase(deps.prisma, user, projectId, testCaseId) });
}

export async function createTestCaseController(
  deps: TestCaseDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParamsSchema.parse(request.params);
  const input = createTestCaseSchema.parse(request.body);

  return reply
    .status(201)
    .send({ testCase: await createTestCase(deps.prisma, user, projectId, input) });
}

export async function updateTestCaseController(
  deps: TestCaseDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, testCaseId } = testCaseParamsSchema.parse(request.params);
  const input = updateTestCaseSchema.parse(request.body);

  return reply
    .status(200)
    .send({ testCase: await updateTestCase(deps.prisma, user, projectId, testCaseId, input) });
}

export async function deleteTestCaseController(
  deps: TestCaseDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, testCaseId } = testCaseParamsSchema.parse(request.params);

  await deleteTestCase(deps.prisma, user, projectId, testCaseId);

  return reply.status(204).send();
}
