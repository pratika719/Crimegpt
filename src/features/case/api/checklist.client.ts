import { apiRequest } from '@/lib/api/client';
import type { ChecklistItem } from '@/lib/api/types';

export const checklistClient = {
  list(caseId: string): Promise<ChecklistItem[]> {
    return apiRequest<ChecklistItem[]>(`/api/cases/${caseId}/checklist`);
  },

  create(caseId: string, title: string): Promise<ChecklistItem> {
    return apiRequest<ChecklistItem>(`/api/cases/${caseId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  update(caseId: string, id: string, input: { title?: string; completed?: boolean }): Promise<ChecklistItem> {
    return apiRequest<ChecklistItem>(`/api/cases/${caseId}/checklist/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  remove(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/checklist/${id}`, {
      method: 'DELETE',
    });
  },
};
