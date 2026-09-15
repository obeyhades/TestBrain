import { z } from 'zod';

const statusSchema = z.enum(['PLANNED', 'IN_TESTING', 'RELEASED']);

export const createReleaseSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  version: z.string().trim().min(1, 'Version is required').max(50),
  description: z.string().trim().max(5000).optional(),
  status: statusSchema.default('PLANNED'),
  // A plain date, kept as a string so no timezone gets invented on the way in.
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
    .nullable()
    .default(null),
});

export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;

export const updateReleaseSchema = createReleaseSchema;

export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;

export const setReleaseTestRunsSchema = z.object({
  testRunIds: z.array(z.string().min(1)).max(200),
});

export type SetReleaseTestRunsInput = z.infer<typeof setReleaseTestRunsSchema>;
