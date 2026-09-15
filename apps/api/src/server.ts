import fastifyCookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import type { PrismaClient } from './database/prisma.js';
import { registerErrorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { buildSessionCookieOptions } from './modules/auth/sessionCookie.js';
import { defectRoutes } from './modules/defects/defect.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { projectRoutes } from './modules/projects/project.routes.js';
import { requirementRoutes } from './modules/requirements/requirement.routes.js';
import { testCaseRoutes } from './modules/testCases/testCase.routes.js';
import { testRunRoutes } from './modules/testRuns/testRun.routes.js';

type ServerOptions = {
  logger: boolean;
  prisma: PrismaClient;
  sessionSecret: string;
  /** Off in development, where there is no HTTPS certificate to require. */
  secureCookies: boolean;
};

/**
 * Builds the Fastify app without starting it.
 *
 * This is the composition root: the one place that knows how the pieces fit
 * together. Everything below receives what it needs as an argument, so no module
 * reaches for a global database client or reads configuration on its own.
 *
 * Keeping "build" separate from "listen" also lets integration tests drive the real
 * app through app.inject() with no network port involved.
 */
export function buildServer(options: ServerOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger });

  registerErrorHandler(app);

  app.register(fastifyCookie, { secret: options.sessionSecret });

  app.register(healthRoutes, { prefix: '/api' });
  app.register(
    authRoutes({
      prisma: options.prisma,
      cookieOptions: buildSessionCookieOptions(options.secureCookies),
    }),
    { prefix: '/api' },
  );
  app.register(projectRoutes({ prisma: options.prisma }), { prefix: '/api' });
  app.register(requirementRoutes({ prisma: options.prisma }), { prefix: '/api' });
  app.register(testCaseRoutes({ prisma: options.prisma }), { prefix: '/api' });
  app.register(testRunRoutes({ prisma: options.prisma }), { prefix: '/api' });
  app.register(defectRoutes({ prisma: options.prisma }), { prefix: '/api' });

  // Closing the app releases the database pool, so tests and shutdowns do not
  // leave connections behind.
  app.addHook('onClose', async () => {
    await options.prisma.$disconnect();
  });

  return app;
}
