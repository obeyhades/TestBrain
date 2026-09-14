import type { FastifyInstance } from 'fastify';

/**
 * Liveness check. Deliberately does not touch the database: it answers
 * "is the API process running", which is what Docker and CI need to know.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return { status: 'ok' };
  });
}
