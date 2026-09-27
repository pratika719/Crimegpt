import { apiRequest } from '@/lib/api/client';
import type { JobStatusResponse } from '@/lib/api/types';

export interface CaseJobItem {
  id: string;
  queueName: string;
  documentType: string | null;
  status: string;
  updatedAt: string;
}

export interface CaseFailedJobItem {
  id: string;
  queueName: string;
  documentType: string | null;
  errorMessage: string | null;
  errorCode: string | null;
  failureType: string | null;
  updatedAt: string;
}

export interface CaseJobsResponse {
  activeJobs: CaseJobItem[];
  failedJobs: CaseFailedJobItem[];
}

export const jobClient = {
  getStatus(queueName: string, jobId: string): Promise<JobStatusResponse> {
    return apiRequest<JobStatusResponse>(`/api/jobs/${queueName}/${jobId}`);
  },
  getCaseJobs(caseId: string): Promise<CaseJobsResponse> {
    return apiRequest<CaseJobsResponse>(`/api/jobs/case/${caseId}`);
  },
};
