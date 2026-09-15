import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestPrismaClient } from '../helpers/testDatabase.js';
import { buildTestServer } from '../helpers/testServer.js';

describe('GET /api/health', () => {
  let app: FastifyInstance;

  beforeAll(() => {
    app = buildTestServer(createTestPrismaClient());
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports that the API is running', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('returns 404 for an unknown route', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/nope' });

    expect(response.statusCode).toBe(404);
  });
});
