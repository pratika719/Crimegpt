import { apiRequest } from '@/lib/api/client';
import type { CaseMetadata } from '@/lib/api/types';

export const caseMetadataClient = {
  get(caseId: string): Promise<CaseMetadata | null> {
    return apiRequest<CaseMetadata | null>(`/api/cases/${caseId}/metadata`);
  },

  save(caseId: string, data: Partial<CaseMetadata>): Promise<CaseMetadata> {
    return apiRequest<CaseMetadata>(`/api/cases/${caseId}/metadata`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
