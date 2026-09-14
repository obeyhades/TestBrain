import { apiRequest } from '../../lib/apiClient';

export type HealthResponse = {
  status: string;
};

export function fetchHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health');
}
