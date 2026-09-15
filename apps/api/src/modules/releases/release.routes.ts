import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createRequireAuth } from '../../middleware/requireAuth.js';
import {
  createReleaseController,
  getReleaseController,
  listReleasesController,
  setReleaseTestRunsController,
  updateReleaseController,
  type ReleaseDependencies,
} from './release.controller.js';

export function releaseRoutes(deps: ReleaseDependencies): FastifyPluginAsync {
  const requireAuth = createRequireAuth(deps.prisma);

  return async function registerReleaseRoutes(app: FastifyInstance): Promise<void> {
    app.addHook('preHandler', requireAuth);

    const base = '/projects/:projectId/releases';

    app.get(base, (request, reply) => listReleasesController(deps, request, reply));

    app.post(base, (request, reply) => createReleaseController(deps, request, reply));

    app.get(`${base}/:releaseId`, (request, reply) => getReleaseController(deps, request, reply));

    app.patch(`${base}/:releaseId`, (request, reply) =>
      updateReleaseController(deps, request, reply),
    );

    app.put(`${base}/:releaseId/test-runs`, (request, reply) =>
      setReleaseTestRunsController(deps, request, reply),
    );
  };
}
