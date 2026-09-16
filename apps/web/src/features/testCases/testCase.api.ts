import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/apiClient';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export type TestStep = {
  position: number;
  action: string;
  expectedResult: string;
};

export type TestCaseSummary = {
  id: string;
  title: string;
  priority: Priority;
  requirement: { id: string; title: string } | null;
};

export type TestCaseDetail = TestCaseSummary & {
  description: string | null;
  preconditions: string | null;
  steps: TestStep[];
};

export type TestCaseInput = {
  title: string;
  description?: string;
  preconditions?: string;
  priority: Priority;
  requirementId: string | null;
  steps: { action: string; expectedResult: string }[];
};

export async function fetchTestCases(projectId: string): Promise<TestCaseSummary[]> {
  const { testCases } = await apiGet<{ testCases: TestCaseSummary[] }>(
    `/projects/${projectId}/test-cases`,
  );

  return testCases;
}

export async function fetchTestCase(
  projectId: string,
  testCaseId: string,
): Promise<TestCaseDetail> {
  const { testCase } = await apiGet<{ testCase: TestCaseDetail }>(
    `/projects/${projectId}/test-cases/${testCaseId}`,
  );

  return testCase;
}

export async function createTestCase(
  projectId: string,
  input: TestCaseInput,
): Promise<TestCaseDetail> {
  const { testCase } = await apiPost<{ testCase: TestCaseDetail }>(
    `/projects/${projectId}/test-cases`,
    input,
  );

  return testCase;
}

export function updateTestCase(
  projectId: string,
  testCaseId: string,
  input: TestCaseInput,
): Promise<unknown> {
  return apiPatch(`/projects/${projectId}/test-cases/${testCaseId}`, input);
}

export function deleteTestCase(projectId: string, testCaseId: string): Promise<void> {
  return apiDelete(`/projects/${projectId}/test-cases/${testCaseId}`);
}

/**
 * Rebuilds the step list from a submitted form.
 *
 * getAll keeps the order the fields appear in the document, so the order on screen
 * is the order that gets saved. No index bookkeeping needed.
 */
export function readStepsFromForm(
  formData: FormData,
): { action: string; expectedResult: string }[] {
  const actions = formData.getAll('stepAction').map(String);
  const results = formData.getAll('stepExpectedResult').map(String);

  return actions
    .map((action, index) => ({ action, expectedResult: results[index] ?? '' }))
    .filter((step) => step.action.trim() !== '' || step.expectedResult.trim() !== '');
}
