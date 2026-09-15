import { z } from 'zod';

const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const testStepSchema = z.object({
  action: z.string().trim().min(1, 'Every step needs an action').max(1000),
  expectedResult: z.string().trim().min(1, 'Every step needs an expected result').max(1000),
});

export const createTestCaseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional(),
  preconditions: z.string().trim().max(5000).optional(),
  priority: prioritySchema.default('MEDIUM'),
  // Linking a test to what it verifies is optional: plenty of useful tests do not
  // belong to a single written requirement.
  requirementId: z.string().min(1).nullable().default(null),
  steps: z.array(testStepSchema).max(50).default([]),
});

export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;

export const updateTestCaseSchema = createTestCaseSchema;

export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;
