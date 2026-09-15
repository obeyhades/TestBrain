import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createRequireAuth } from '../../middleware/requireAuth.js';
import {
  createDefectController,
  getDefectController,
  listDefectsController,
  updateDefectController,
  type DefectDependencies,
} from './defect.controller.js';

export function defectRoutes(deps: DefectDependencies): FastifyPluginAsync {
  const requireAuth = createRequireAuth(deps.prisma);

  return async function registerDefectRoutes(app: FastifyInstance): Promise<void> {
    app.addHook('preHandler', requireAuth);

    app.get('/projects/:projectId/defects', (request, reply) =>
      listDefectsController(deps, request, reply),
    );

    app.post('/projects/:projectId/defects', (request, reply) =>
      createDefectController(deps, request, reply),
    );

    app.get('/projects/:projectId/defects/:defectId', (request, reply) =>
      getDefectController(deps, request, reply),
    );

    app.patch('/projects/:projectId/defects/:defectId', (request, reply) =>
      updateDefectController(deps, request, reply),
    );
  };
}
