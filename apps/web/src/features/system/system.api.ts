import { apiGet } from '../../lib/apiClient';

export type HealthResponse = {
  status: string;
};

export function fetchHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>('/health');
}
