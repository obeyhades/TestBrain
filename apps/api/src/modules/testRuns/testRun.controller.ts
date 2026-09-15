import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '../../database/prisma.js';
import { getAuthenticatedUser } from '../../middleware/requireAuth.js';
import { addTestCasesSchema, createTestRunSchema, recordResultSchema } from './testRun.schema.js';
import {
  addTestCasesToRun,
  createTestRun,
  getTestRun,
  listTestRuns,
  recordTestResult,
  removeTestCaseFromRun,
  setTestRunCompleted,
} from './testRun.service.js';

export type TestRunDependencies = {
  prisma: PrismaClient;
};

const projectParams = z.object({ projectId: z.string().min(1) });
const runParams = projectParams.extend({ testRunId: z.string().min(1) });
const resultParams = runParams.extend({ testCaseId: z.string().min(1) });

export async function listTestRunsController(
  deps: TestRunDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParams.parse(request.params);

  return reply.status(200).send({ testRuns: await listTestRuns(deps.prisma, user, projectId) });
}

export async function getTestRunController(
  deps: TestRunDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, testRunId } = runParams.parse(request.params);

  return reply
    .status(200)
    .send({ testRun: await getTestRun(deps.prisma, user, projectId, testRunId) });
}

export async function createTestRunController(
  deps: TestRunDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId } = projectParams.parse(request.params);
  const input = createTestRunSchema.parse(request.body);

  return reply
    .status(201)
    .send({ testRun: await createTestRun(deps.prisma, user, projectId, input) });
}

export async function addTestCasesController(
  deps: TestRunDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, testRunId } = runParams.parse(request.params);
  const input = addTestCasesSchema.parse(request.body);

  await addTestCasesToRun(deps.prisma, user, projectId, testRunId, input);

  return reply.status(204).send();
}

export async function recordResultController(
  deps: TestRunDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, testRunId, testCaseId } = resultParams.parse(request.params);
  const input = recordResultSchema.parse(request.body);

  await recordTestResult(deps.prisma, user, projectId, testRunId, testCaseId, input);

  return reply.status(204).send();
}

export async function removeTestCaseController(
  deps: TestRunDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, testRunId, testCaseId } = resultParams.parse(request.params);

  await removeTestCaseFromRun(deps.prisma, user, projectId, testRunId, testCaseId);

  return reply.status(204).send();
}

export async function completeTestRunController(
  deps: TestRunDependencies,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = getAuthenticatedUser(request);
  const { projectId, testRunId } = runParams.parse(request.params);
  const { completed } = z.object({ completed: z.boolean() }).parse(request.body);

  await setTestRunCompleted(deps.prisma, user, projectId, testRunId, completed);

  return reply.status(204).send();
}
