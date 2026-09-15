import type { RequirementStatus } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../database/prisma.js';

/**
 * Database queries for requirements. No business rules here.
 *
 * Every lookup is scoped by projectId as well as by id. A requirement id alone is
 * not proof of anything: without the project in the query, somebody who belongs to
 * one project could read another project's requirement just by knowing its id.
 */

export function findRequirementsForProject(prisma: PrismaClient, projectId: string) {
  return prisma.requirement.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
}

export function findRequirementInProject(
  prisma: PrismaClient,
  projectId: string,
  requirementId: string,
) {
  return prisma.requirement.findFirst({ where: { id: requirementId, projectId } });
}

export function createRequirement(
  prisma: PrismaClient,
  data: {
    projectId: string;
    title: string;
    description: string | null;
    status: RequirementStatus;
    createdById: string;
  },
) {
  return prisma.requirement.create({ data });
}

export function updateRequirement(
  prisma: PrismaClient,
  requirementId: string,
  data: { title: string; description: string | null; status: RequirementStatus },
) {
  return prisma.requirement.update({ where: { id: requirementId }, data });
}

export function deleteRequirement(prisma: PrismaClient, requirementId: string) {
  return prisma.requirement.delete({ where: { id: requirementId } });
}
