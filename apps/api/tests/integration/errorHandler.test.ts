import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import { registerErrorHandler } from '../../src/middleware/errorHandler.js';
import { ForbiddenError, NotFoundError } from '../../src/shared/errors.js';

/**
 * Routes that exist only to make each branch of the error handler reachable.
 */
function buildAppWithThrowingRoutes(): FastifyInstance {
  const app = Fastify({ logger: false });

  registerErrorHandler(app);

  app.get('/not-found', async () => {
    throw new NotFoundError('Project not found');
  });

  app.get('/forbidden', async () => {
    throw new ForbiddenError();
  });

  app.get('/invalid', async () => {
    z.object({ title: z.string() }).parse({ title: 123 });
  });

  app.get('/boom', async () => {
    throw new Error('database exploded');
  });

  return app;
}

describe('error handler', () => {
  let app: FastifyInstance;

  beforeAll(() => {
    app = buildAppWithThrowingRoutes();
  });

  afterAll(async () => {
    await app.close();
  });

  it('maps NotFoundError to 404 and keeps its message', async () => {
    const response = await app.inject({ method: 'GET', url: '/not-found' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Project not found' });
  });

  it('maps ForbiddenError to 403', async () => {
    const response = await app.inject({ method: 'GET', url: '/forbidden' });

    expect(response.statusCode).toBe(403);
  });

  it('maps a Zod failure to 400 with field details', async () => {
    const response = await app.inject({ method: 'GET', url: '/invalid' });

    expect(response.statusCode).toBe(400);
    expect(response.json().details).toEqual([{ path: 'title', message: expect.any(String) }]);
  });

  it('hides unexpected errors behind a generic 500', async () => {
    const response = await app.inject({ method: 'GET', url: '/boom' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'Internal server error' });
    expect(response.body).not.toContain('database exploded');
  });
});
