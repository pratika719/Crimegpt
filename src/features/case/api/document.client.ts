import { apiRequest } from '@/lib/api/client';
import type { GeneratedDocument } from '@/lib/api/types';

export interface GenerateDocumentInput {
  documentType: string;
  forceRegenerate?: boolean;
}

export interface LogDocumentActivityInput {
  actionType: 'DOWNLOAD' | 'REGENERATE';
  docType: string;
  docTitle: string;
  version: number;
}

export const documentClient = {
  list(caseId: string): Promise<GeneratedDocument[]> {
    return apiRequest<GeneratedDocument[]>(`/api/cases/${caseId}/documents`);
  },

  generate(caseId: string, input: GenerateDocumentInput): Promise<{ message: string; caseId: string; documentType: string; status: string }> {
    return apiRequest(`/api/cases/${caseId}/documents`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  rename(caseId: string, id: string, title: string): Promise<GeneratedDocument> {
    return apiRequest<GeneratedDocument>(`/api/cases/${caseId}/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  },

  remove(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/documents/${id}`, {
      method: 'DELETE',
    });
  },

  logActivity(caseId: string, input: LogDocumentActivityInput): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/cases/${caseId}/documents/activity`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
