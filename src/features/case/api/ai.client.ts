import { apiRequest } from '@/lib/api/client';
import type { GeneratedDocument } from '@/lib/api/types';

export const aiClient = {
  legalAnalysis(caseId: string): Promise<GeneratedDocument> {
    return apiRequest<GeneratedDocument>(`/api/cases/${caseId}/ai/legal-analysis`, {
      method: 'POST',
    });
  },

  diagnostics(caseId: string): Promise<any> {
    return apiRequest<any>(`/api/cases/${caseId}/ai/diagnostics`, {
      method: 'POST',
    });
  },

  investigationSummary(caseId: string): Promise<GeneratedDocument> {
    return apiRequest<GeneratedDocument>(`/api/cases/${caseId}/ai/investigation-summary`, {
      method: 'POST',
    });
  },
};
