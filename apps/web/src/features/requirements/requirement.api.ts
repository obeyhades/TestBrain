import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/apiClient';

export type RequirementStatus = 'DRAFT' | 'APPROVED' | 'IMPLEMENTED';

export type Requirement = {
  id: string;
  title: string;
  description: string | null;
  status: RequirementStatus;
  createdAt: string;
};

export const REQUIREMENT_STATUS_LABELS: Record<RequirementStatus, string> = {
  DRAFT: 'Draft',
  APPROVED: 'Approved',
  IMPLEMENTED: 'Implemented',
};

export async function fetchRequirements(projectId: string): Promise<Requirement[]> {
  const { requirements } = await apiGet<{ requirements: Requirement[] }>(
    `/projects/${projectId}/requirements`,
  );

  return requirements;
}

export async function fetchRequirement(
  projectId: string,
  requirementId: string,
): Promise<Requirement> {
  const { requirement } = await apiGet<{ requirement: Requirement }>(
    `/projects/${projectId}/requirements/${requirementId}`,
  );

  return requirement;
}

export function createRequirement(
  projectId: string,
  input: { title: string; description?: string; status: RequirementStatus },
): Promise<unknown> {
  return apiPost(`/projects/${projectId}/requirements`, input);
}

export function updateRequirement(
  projectId: string,
  requirementId: string,
  input: { title: string; description?: string; status: RequirementStatus },
): Promise<unknown> {
  return apiPatch(`/projects/${projectId}/requirements/${requirementId}`, input);
}

export function deleteRequirement(projectId: string, requirementId: string): Promise<void> {
  return apiDelete(`/projects/${projectId}/requirements/${requirementId}`);
}
