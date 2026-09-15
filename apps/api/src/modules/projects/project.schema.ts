import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(100),
  description: z.string().trim().max(2000).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema;

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

const projectRoleSchema = z.enum(['ADMIN', 'PROJECT_MANAGER', 'QA', 'DEVELOPER']);

export const addProjectMemberSchema = z.object({
  // Members are added by address rather than picked from a list of everybody on
  // the instance, so no endpoint has to hand out a directory of users.
  email: z.email(),
  role: projectRoleSchema,
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;

export const updateProjectMemberRoleSchema = z.object({
  role: projectRoleSchema,
});

export type UpdateProjectMemberRoleInput = z.infer<typeof updateProjectMemberRoleSchema>;
