import { z } from 'zod';

export const createTestRunSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
});

export type CreateTestRunInput = z.infer<typeof createTestRunSchema>;

export const addTestCasesSchema = z.object({
  testCaseIds: z.array(z.string().min(1)).min(1, 'Pick at least one test case').max(500),
});

export type AddTestCasesInput = z.infer<typeof addTestCasesSchema>;

export const recordResultSchema = z.object({
  status: z.enum(['NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED']),
  notes: z.string().trim().max(2000).optional(),
});

export type RecordResultInput = z.infer<typeof recordResultSchema>;
