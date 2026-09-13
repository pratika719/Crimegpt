import { apiRequest } from '@/lib/api/client';
import type { CaseActivity } from '@/lib/api/types';

export const timelineClient = {
  update(caseId: string, id: string, description: string): Promise<CaseActivity> {
    return apiRequest<CaseActivity>(`/api/cases/${caseId}/timeline/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ description }),
    });
  },

  remove(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/timeline/${id}`, {
      method: 'DELETE',
    });
  },
};
