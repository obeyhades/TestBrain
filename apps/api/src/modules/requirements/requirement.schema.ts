import { z } from 'zod';

const requirementStatusSchema = z.enum(['DRAFT', 'APPROVED', 'IMPLEMENTED']);

export const createRequirementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional(),
  status: requirementStatusSchema.default('DRAFT'),
});

export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;

export const updateRequirementSchema = createRequirementSchema;

export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>;
