import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createRequireAuth } from '../../middleware/requireAuth.js';
import {
  addProjectMemberController,
  createProjectController,
  getProjectController,
  listProjectMembersController,
  listProjectsController,
  removeProjectMemberController,
  updateProjectController,
  updateProjectMemberRoleController,
  type ProjectDependencies,
} from './project.controller.js';

/**
 * Every route here requires a session. What each role may then do is decided in the
 * services, because it depends on the project being acted on rather than on the URL.
 */
export function projectRoutes(deps: ProjectDependencies): FastifyPluginAsync {
  const requireAuth = createRequireAuth(deps.prisma);

  return async function registerProjectRoutes(app: FastifyInstance): Promise<void> {
    app.addHook('preHandler', requireAuth);

    app.get('/projects', (request, reply) => listProjectsController(deps, request, reply));

    app.post('/projects', (request, reply) => createProjectController(deps, request, reply));

    app.get('/projects/:projectId', (request, reply) => getProjectController(deps, request, reply));

    app.patch('/projects/:projectId', (request, reply) =>
      updateProjectController(deps, request, reply),
    );

    app.get('/projects/:projectId/members', (request, reply) =>
      listProjectMembersController(deps, request, reply),
    );

    app.post('/projects/:projectId/members', (request, reply) =>
      addProjectMemberController(deps, request, reply),
    );

    app.patch('/projects/:projectId/members/:userId', (request, reply) =>
      updateProjectMemberRoleController(deps, request, reply),
    );

    app.delete('/projects/:projectId/members/:userId', (request, reply) =>
      removeProjectMemberController(deps, request, reply),
    );
  };
}
