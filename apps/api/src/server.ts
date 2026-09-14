import Fastify, { type FastifyInstance } from 'fastify';
import { registerErrorHandler } from './middleware/errorHandler.js';
import { healthRoutes } from './modules/health/health.routes.js';

type ServerOptions = {
  logger: boolean;
};

/**
 * Builds the Fastify app without starting it.
 *
 * Keeping "build" separate from "listen" lets integration tests drive the real app
 * through app.inject() with no network port involved.
 */
export function buildServer(options: ServerOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger });

  registerErrorHandler(app);

  app.register(healthRoutes, { prefix: '/api' });

  return app;
}
