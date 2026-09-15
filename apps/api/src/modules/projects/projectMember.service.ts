import type { ProjectRole } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors.js';
import * as authRepository from '../auth/auth.repository.js';
import { normalizeEmail, type AuthenticatedUser } from '../auth/auth.service.js';
import { canManageProject } from './permissions.js';
import * as projectRepository from './project.repository.js';
import { requireProjectRole } from './project.service.js';
import type { AddProjectMemberInput, UpdateProjectMemberRoleInput } from './project.schema.js';

export type ProjectMemberSummary = {
  userId: string;
  email: string;
  name: string;
  role: ProjectRole;
};

type MemberRecord = {
  role: ProjectRole;
  user: { id: string; email: string; name: string };
};

function toMemberSummary(member: MemberRecord): ProjectMemberSummary {
  return {
    userId: member.user.id,
    email: member.user.email,
    name: member.user.name,
    role: member.role,
  };
}

/** Anybody in the project can see who else is in it. */
export async function listProjectMembers(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
): Promise<ProjectMemberSummary[]> {
  await requireProjectRole(prisma, projectId, user.id);

  const members = await projectRepository.findProjectMembers(prisma, projectId);

  return members.map(toMemberSummary);
}

export async function addProjectMember(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  input: AddProjectMemberInput,
): Promise<ProjectMemberSummary> {
  const role = await requireProjectRole(prisma, projectId, user.id);

  if (!canManageProject(role)) {
    throw new ForbiddenError('You do not have permission to manage this project');
  }

  const invitee = await authRepository.findUserByEmail(prisma, normalizeEmail(input.email));

  if (invitee === null) {
    throw new NotFoundError('No account exists for that email address');
  }

  const existing = await projectRepository.findMemberRole(prisma, projectId, invitee.id);

  if (existing !== null) {
    throw new ConflictError('That person is already a member of this project');
  }

  const member = await projectRepository.createProjectMember(prisma, {
    projectId,
    userId: invitee.id,
    role: input.role,
  });

  return toMemberSummary(member);
}

export async function updateProjectMemberRole(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  memberUserId: string,
  input: UpdateProjectMemberRoleInput,
): Promise<ProjectMemberSummary> {
  const role = await requireProjectRole(prisma, projectId, user.id);

  if (!canManageProject(role)) {
    throw new ForbiddenError('You do not have permission to manage this project');
  }

  const current = await projectRepository.findMemberRole(prisma, projectId, memberUserId);

  if (current === null) {
    throw new NotFoundError('That person is not a member of this project');
  }

  await ensureProjectKeepsAnAdmin(prisma, projectId, current.role, input.role);

  const member = await projectRepository.updateProjectMemberRole(
    prisma,
    projectId,
    memberUserId,
    input.role,
  );

  return toMemberSummary(member);
}

export async function removeProjectMember(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  projectId: string,
  memberUserId: string,
): Promise<void> {
  const role = await requireProjectRole(prisma, projectId, user.id);

  if (!canManageProject(role)) {
    throw new ForbiddenError('You do not have permission to manage this project');
  }

  const current = await projectRepository.findMemberRole(prisma, projectId, memberUserId);

  if (current === null) {
    throw new NotFoundError('That person is not a member of this project');
  }

  await ensureProjectKeepsAnAdmin(prisma, projectId, current.role, null);

  await projectRepository.deleteProjectMember(prisma, projectId, memberUserId);
}

/**
 * A project with no administrator can never have its members or settings changed
 * again, so the last one cannot be demoted or removed.
 *
 * Pass null as the new role when the member is being removed outright.
 */
async function ensureProjectKeepsAnAdmin(
  prisma: PrismaClient,
  projectId: string,
  currentRole: ProjectRole,
  newRole: ProjectRole | null,
): Promise<void> {
  const staysAdmin = newRole === 'ADMIN';

  if (currentRole !== 'ADMIN' || staysAdmin) {
    return;
  }

  const admins = await projectRepository.countProjectAdmins(prisma, projectId);

  if (admins <= 1) {
    throw new ConflictError('A project must always have at least one administrator');
  }
}
