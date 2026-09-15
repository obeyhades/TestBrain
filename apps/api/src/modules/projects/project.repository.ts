import type { ProjectRole } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';

/**
 * Database queries for projects and their members. No business rules here: this
 * file only knows how to read and write rows.
 */

export function findProjectById(prisma: PrismaClient, projectId: string) {
  return prisma.project.findUnique({ where: { id: projectId } });
}

export function findProjectsForUser(prisma: PrismaClient, userId: string) {
  return prisma.project.findMany({
    where: { members: { some: { userId } } },
    orderBy: { name: 'asc' },
  });
}

/**
 * Creates the project and its first membership together, so a project can never
 * exist without somebody able to administer it.
 */
export function createProjectWithOwner(
  prisma: PrismaClient,
  data: { name: string; description: string | null; createdById: string },
) {
  return prisma.project.create({
    data: {
      ...data,
      members: { create: { userId: data.createdById, role: 'ADMIN' } },
    },
  });
}

export function updateProject(
  prisma: PrismaClient,
  projectId: string,
  data: { name: string; description: string | null },
) {
  return prisma.project.update({ where: { id: projectId }, data });
}

export function findMemberRole(prisma: PrismaClient, projectId: string, userId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
}

export function findProjectMembers(prisma: PrismaClient, projectId: string) {
  return prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export function createProjectMember(
  prisma: PrismaClient,
  data: { projectId: string; userId: string; role: ProjectRole },
) {
  return prisma.projectMember.create({
    data,
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}

export function updateProjectMemberRole(
  prisma: PrismaClient,
  projectId: string,
  userId: string,
  role: ProjectRole,
) {
  return prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { role },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}

export function deleteProjectMember(prisma: PrismaClient, projectId: string, userId: string) {
  return prisma.projectMember.deleteMany({ where: { projectId, userId } });
}

export function countProjectAdmins(prisma: PrismaClient, projectId: string) {
  return prisma.projectMember.count({ where: { projectId, role: 'ADMIN' } });
}
