import type { ProjectRole } from '../../generated/prisma/enums.js';

/**
 * What each project role may do.
 *
 * Being a member at all is the permission to *see* a project, so there is no
 * canViewProject: if findMemberRole returns a role, the person is allowed to look.
 * These functions only decide what somebody may change.
 *
 * Deliberately plain conditionals rather than a permission engine. Every rule in
 * the system can be read in one screen, and grepping for a role name finds every
 * place it matters.
 */

/** Rename the project, change its description, and add or remove members. */
export function canManageProject(role: ProjectRole): boolean {
  return role === 'ADMIN' || role === 'PROJECT_MANAGER';
}

/**
 * Write requirements. Developers read them but do not own them: deciding what the
 * product should do is the job of the people planning and testing it.
 */
export function canEditRequirements(role: ProjectRole): boolean {
  return role === 'ADMIN' || role === 'PROJECT_MANAGER' || role === 'QA';
}
