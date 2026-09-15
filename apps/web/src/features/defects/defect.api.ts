import { apiGet, apiPatch, apiPost } from '../../lib/apiClient';

export type DefectSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DefectStatus = 'OPEN' | 'IN_PROGRESS' | 'READY_FOR_TEST' | 'VERIFIED' | 'CLOSED';

export const SEVERITY_LABELS: Record<DefectSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const DEFECT_STATUS_LABELS: Record<DefectStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  READY_FOR_TEST: 'Ready for test',
  VERIFIED: 'Verified',
  CLOSED: 'Closed',
};

export type Defect = {
  id: string;
  title: string;
  description: string | null;
  severity: DefectSeverity;
  status: DefectStatus;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  environment: string | null;
  testCase: { id: string; title: string } | null;
  testRun: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  createdAt: string;
};

export type DefectInput = {
  title: string;
  description?: string;
  severity: DefectSeverity;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  environment?: string;
  testCaseId: string | null;
  testRunId: string | null;
  assignedToId: string | null;
};

export async function fetchDefects(projectId: string): Promise<Defect[]> {
  const { defects } = await apiGet<{ defects: Defect[] }>(`/projects/${projectId}/defects`);

  return defects;
}

export async function fetchDefect(projectId: string, defectId: string): Promise<Defect> {
  const { defect } = await apiGet<{ defect: Defect }>(`/projects/${projectId}/defects/${defectId}`);

  return defect;
}

export async function createDefect(projectId: string, input: DefectInput): Promise<Defect> {
  const { defect } = await apiPost<{ defect: Defect }>(`/projects/${projectId}/defects`, input);

  return defect;
}

export function updateDefect(
  projectId: string,
  defectId: string,
  input: DefectInput & { status: DefectStatus },
): Promise<unknown> {
  return apiPatch(`/projects/${projectId}/defects/${defectId}`, input);
}

/** The fields that are simply left out when somebody has not filled them in. */
const OPTIONAL_FIELDS = [
  'description',
  'stepsToReproduce',
  'expectedResult',
  'actualResult',
  'environment',
] as const;

/**
 * Turns a submitted form into the shape the API expects.
 *
 * Both the reporting page and the editing page send the same fields, so they read
 * them back the same way.
 */
export function readDefectFromForm(formData: FormData): DefectInput {
  function text(name: string): string {
    return String(formData.get(name) ?? '').trim();
  }

  const input: DefectInput = {
    title: text('title'),
    severity: (text('severity') || 'MEDIUM') as DefectSeverity,
    // An empty select means "not linked", which the API expects as null.
    testCaseId: text('testCaseId') || null,
    testRunId: text('testRunId') || null,
    assignedToId: text('assignedToId') || null,
  };

  for (const field of OPTIONAL_FIELDS) {
    const value = text(field);

    if (value !== '') {
      input[field] = value;
    }
  }

  return input;
}
