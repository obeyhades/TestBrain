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
