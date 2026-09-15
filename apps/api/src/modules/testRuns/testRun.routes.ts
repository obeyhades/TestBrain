import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createRequireAuth } from '../../middleware/requireAuth.js';
import {
  addTestCasesController,
  completeTestRunController,
  createTestRunController,
  getTestRunController,
  listTestRunsController,
  recordResultController,
  removeTestCaseController,
  type TestRunDependencies,
} from './testRun.controller.js';

export function testRunRoutes(deps: TestRunDependencies): FastifyPluginAsync {
  const requireAuth = createRequireAuth(deps.prisma);

  return async function registerTestRunRoutes(app: FastifyInstance): Promise<void> {
    app.addHook('preHandler', requireAuth);

    const base = '/projects/:projectId/test-runs';

    app.get(base, (request, reply) => listTestRunsController(deps, request, reply));

    app.post(base, (request, reply) => createTestRunController(deps, request, reply));

    app.get(`${base}/:testRunId`, (request, reply) => getTestRunController(deps, request, reply));

    app.patch(`${base}/:testRunId`, (request, reply) =>
      completeTestRunController(deps, request, reply),
    );

    app.post(`${base}/:testRunId/test-cases`, (request, reply) =>
      addTestCasesController(deps, request, reply),
    );

    app.put(`${base}/:testRunId/results/:testCaseId`, (request, reply) =>
      recordResultController(deps, request, reply),
    );

    app.delete(`${base}/:testRunId/test-cases/:testCaseId`, (request, reply) =>
      removeTestCaseController(deps, request, reply),
    );
  };
}
