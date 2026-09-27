import { apiRequest } from '@/lib/api/client';
import type { AuditLogFilters } from '@/lib/api/types';

export const auditClient = {
  getLogs(filters: AuditLogFilters = {}): Promise<any> {
    const params = new URLSearchParams();
    if (filters.caseId) params.set('caseId', filters.caseId);
    if (filters.module) params.set('module', filters.module);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.isAi !== undefined) params.set('isAi', String(filters.isAi));
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.search) params.set('search', filters.search);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));

    const queryStr = params.toString();
    const path = queryStr ? `/api/audit?${queryStr}` : '/api/audit';
    return apiRequest<any>(path);
  },

  getCasesForFilter(): Promise<{ cases: Array<{ id: string; title: string }> }> {
    return apiRequest<{ cases: Array<{ id: string; title: string }> }>('/api/audit/cases');
  },
};
