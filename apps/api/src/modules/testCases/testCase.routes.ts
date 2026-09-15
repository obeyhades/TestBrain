import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createRequireAuth } from '../../middleware/requireAuth.js';
import {
  createTestCaseController,
  deleteTestCaseController,
  getTestCaseController,
  listTestCasesController,
  updateTestCaseController,
  type TestCaseDependencies,
} from './testCase.controller.js';

export function testCaseRoutes(deps: TestCaseDependencies): FastifyPluginAsync {
  const requireAuth = createRequireAuth(deps.prisma);

  return async function registerTestCaseRoutes(app: FastifyInstance): Promise<void> {
    app.addHook('preHandler', requireAuth);

    app.get('/projects/:projectId/test-cases', (request, reply) =>
      listTestCasesController(deps, request, reply),
    );

    app.post('/projects/:projectId/test-cases', (request, reply) =>
      createTestCaseController(deps, request, reply),
    );

    app.get('/projects/:projectId/test-cases/:testCaseId', (request, reply) =>
      getTestCaseController(deps, request, reply),
    );

    app.patch('/projects/:projectId/test-cases/:testCaseId', (request, reply) =>
      updateTestCaseController(deps, request, reply),
    );

    app.delete('/projects/:projectId/test-cases/:testCaseId', (request, reply) =>
      deleteTestCaseController(deps, request, reply),
    );
  };
}
