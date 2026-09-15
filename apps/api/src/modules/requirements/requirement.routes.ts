import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createRequireAuth } from '../../middleware/requireAuth.js';
import {
  createRequirementController,
  deleteRequirementController,
  getRequirementController,
  listRequirementsController,
  updateRequirementController,
  type RequirementDependencies,
} from './requirement.controller.js';

export function requirementRoutes(deps: RequirementDependencies): FastifyPluginAsync {
  const requireAuth = createRequireAuth(deps.prisma);

  return async function registerRequirementRoutes(app: FastifyInstance): Promise<void> {
    app.addHook('preHandler', requireAuth);

    app.get('/projects/:projectId/requirements', (request, reply) =>
      listRequirementsController(deps, request, reply),
    );

    app.post('/projects/:projectId/requirements', (request, reply) =>
      createRequirementController(deps, request, reply),
    );

    app.get('/projects/:projectId/requirements/:requirementId', (request, reply) =>
      getRequirementController(deps, request, reply),
    );

    app.patch('/projects/:projectId/requirements/:requirementId', (request, reply) =>
      updateRequirementController(deps, request, reply),
    );

    app.delete('/projects/:projectId/requirements/:requirementId', (request, reply) =>
      deleteRequirementController(deps, request, reply),
    );
  };
}
