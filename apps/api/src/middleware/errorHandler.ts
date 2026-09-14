import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors.js';

/**
 * Maps thrown errors to HTTP responses. This is the only place in the API that
 * translates an error into a status code.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Invalid request',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    // Anything else is a bug. Log the real error, tell the client nothing.
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  });
}
