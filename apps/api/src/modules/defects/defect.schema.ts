import { z } from 'zod';

const severitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const statusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'READY_FOR_TEST', 'VERIFIED', 'CLOSED']);

const optionalText = z.string().trim().max(5000).optional();

export const createDefectSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: optionalText,
  severity: severitySchema.default('MEDIUM'),
  stepsToReproduce: optionalText,
  expectedResult: optionalText,
  actualResult: optionalText,
  environment: z.string().trim().max(200).optional(),
  testCaseId: z.string().min(1).nullable().default(null),
  testRunId: z.string().min(1).nullable().default(null),
  assignedToId: z.string().min(1).nullable().default(null),
});

export type CreateDefectInput = z.infer<typeof createDefectSchema>;

export const updateDefectSchema = createDefectSchema.extend({
  status: statusSchema,
});

export type UpdateDefectInput = z.infer<typeof updateDefectSchema>;
