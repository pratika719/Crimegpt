import { apiRequest } from '@/lib/api/client';
import type { Evidence } from '@/lib/api/types';

export interface CreateEvidenceInput {
  title: string;
  type: string;
  description?: string;
  fileUrl?: string;
  notes?: string;
}

export interface UpdateEvidenceInput {
  title?: string;
  type?: string;
  description?: string;
  fileUrl?: string;
  notes?: string;
}

export const evidenceClient = {
  list(caseId: string): Promise<Evidence[]> {
    return apiRequest<Evidence[]>(`/api/cases/${caseId}/evidence`);
  },

  get(caseId: string, id: string): Promise<Evidence> {
    return apiRequest<Evidence>(`/api/cases/${caseId}/evidence/${id}`);
  },

  create(caseId: string, input: CreateEvidenceInput): Promise<Evidence> {
    return apiRequest<Evidence>(`/api/cases/${caseId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(caseId: string, id: string, input: UpdateEvidenceInput): Promise<Evidence> {
    return apiRequest<Evidence>(`/api/cases/${caseId}/evidence/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  remove(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/evidence/${id}`, {
      method: 'DELETE',
    });
  },
};
