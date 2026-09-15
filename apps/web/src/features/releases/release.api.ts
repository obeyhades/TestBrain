import { apiGet, apiPost, apiSendWithoutResponse } from '../../lib/apiClient';
import type { DefectSeverity, DefectStatus } from '../defects/defect.api';
import type { TestRunSummary } from '../testRuns/testRun.api';

export type ReleaseStatus = 'PLANNED' | 'IN_TESTING' | 'RELEASED';

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  PLANNED: 'Planned',
  IN_TESTING: 'In testing',
  RELEASED: 'Released',
};

export type ReleaseQuality = {
  readiness: 'READY' | 'NOT_READY';
  blockers: string[];
  summary: TestRunSummary;
  notExecuted: number;
};

export type ReleaseListItem = {
  id: string;
  name: string;
  version: string;
  status: ReleaseStatus;
  targetDate: string | null;
  quality: ReleaseQuality;
};

export type ReleaseDetail = ReleaseListItem & {
  description: string | null;
  testRuns: { id: string; name: string }[];
  defects: { id: string; title: string; severity: DefectSeverity; status: DefectStatus }[];
};

export type ReleaseInput = {
  name: string;
  version: string;
  description?: string;
  status: ReleaseStatus;
  targetDate: string | null;
};

export async function fetchReleases(projectId: string): Promise<ReleaseListItem[]> {
  const { releases } = await apiGet<{ releases: ReleaseListItem[] }>(
    `/projects/${projectId}/releases`,
  );

  return releases;
}

export async function fetchRelease(projectId: string, releaseId: string): Promise<ReleaseDetail> {
  const { release } = await apiGet<{ release: ReleaseDetail }>(
    `/projects/${projectId}/releases/${releaseId}`,
  );

  return release;
}

export async function createRelease(
  projectId: string,
  input: ReleaseInput,
): Promise<{ id: string }> {
  const { release } = await apiPost<{ release: { id: string } }>(
    `/projects/${projectId}/releases`,
    input,
  );

  return release;
}

export function updateRelease(
  projectId: string,
  releaseId: string,
  input: ReleaseInput,
): Promise<void> {
  return apiSendWithoutResponse('PATCH', `/projects/${projectId}/releases/${releaseId}`, input);
}

export function setReleaseTestRuns(
  projectId: string,
  releaseId: string,
  testRunIds: string[],
): Promise<void> {
  return apiSendWithoutResponse('PUT', `/projects/${projectId}/releases/${releaseId}/test-runs`, {
    testRunIds,
  });
}

/** The fields shared by the create dialog and the edit form. */
export function readReleaseFromForm(formData: FormData): ReleaseInput {
  function text(name: string): string {
    return String(formData.get(name) ?? '').trim();
  }

  const description = text('description');

  return {
    name: text('name'),
    version: text('version'),
    status: (text('status') || 'PLANNED') as ReleaseStatus,
    targetDate: text('targetDate') || null,
    ...(description === '' ? {} : { description }),
  };
}
