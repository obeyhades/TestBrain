import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createRequireAuth } from '../../middleware/requireAuth.js';
import {
  loginController,
  logoutController,
  meController,
  registerController,
  type AuthDependencies,
} from './auth.controller.js';

/**
 * Routes receive their dependencies as an argument rather than reaching for a
 * global, which is why server.ts is the only place that builds a database client.
 */
export function authRoutes(deps: AuthDependencies): FastifyPluginAsync {
  const requireAuth = createRequireAuth(deps.prisma);

  return async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
    app.post('/auth/register', (request, reply) => registerController(deps, request, reply));

    app.post('/auth/login', (request, reply) => loginController(deps, request, reply));

    app.post('/auth/logout', (request, reply) => logoutController(deps, request, reply));

    app.get('/auth/me', { preHandler: requireAuth }, (request, reply) =>
      meController(request, reply),
    );
  };
}
