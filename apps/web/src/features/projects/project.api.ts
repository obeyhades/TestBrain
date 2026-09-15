import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/apiClient';

export type ProjectRole = 'ADMIN' | 'PROJECT_MANAGER' | 'QA' | 'DEVELOPER';

export type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export type ProjectMember = {
  userId: string;
  email: string;
  name: string;
  role: ProjectRole;
};

/** The labels people read, kept apart from the values the API speaks. */
export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  ADMIN: 'Administrator',
  PROJECT_MANAGER: 'Project manager',
  QA: 'QA',
  DEVELOPER: 'Developer',
};

export async function fetchProjects(): Promise<Project[]> {
  const { projects } = await apiGet<{ projects: Project[] }>('/projects');

  return projects;
}

export async function fetchProject(projectId: string): Promise<Project> {
  const { project } = await apiGet<{ project: Project }>(`/projects/${projectId}`);

  return project;
}

export async function createProject(input: {
  name: string;
  description?: string;
}): Promise<Project> {
  const { project } = await apiPost<{ project: Project }>('/projects', input);

  return project;
}

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { members } = await apiGet<{ members: ProjectMember[] }>(`/projects/${projectId}/members`);

  return members;
}

export function addProjectMember(
  projectId: string,
  input: { email: string; role: ProjectRole },
): Promise<unknown> {
  return apiPost(`/projects/${projectId}/members`, input);
}

export function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<unknown> {
  return apiPatch(`/projects/${projectId}/members/${userId}`, { role });
}

export function removeProjectMember(projectId: string, userId: string): Promise<void> {
  return apiDelete(`/projects/${projectId}/members/${userId}`);
}
