import { apiRequest } from '@/lib/api/client';
import type { CaseDetail, CaseSummary } from '@/lib/api/types';

export interface CreateCaseInput {
  title: string;
  narrative: string;
}

export interface UpdateCaseInput {
  title?: string;
  narrative?: string;
  status?: string;
}

export const caseClient = {
  list(): Promise<CaseSummary[]> {
    return apiRequest<CaseSummary[]>('/api/cases');
  },

  get(id: string): Promise<CaseDetail> {
    return apiRequest<CaseDetail>(`/api/cases/${id}`);
  },

  create(input: CreateCaseInput): Promise<CaseSummary> {
    return apiRequest<CaseSummary>('/api/cases', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(id: string, input: UpdateCaseInput): Promise<CaseSummary> {
    return apiRequest<CaseSummary>(`/api/cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  remove(id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${id}`, {
      method: 'DELETE',
    });
  },
};
