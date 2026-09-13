import { apiRequest } from '@/lib/api/client';
import type { JobStatusResponse } from '@/lib/api/types';

export const jobClient = {
  getStatus(queueName: string, jobId: string): Promise<JobStatusResponse> {
    return apiRequest<JobStatusResponse>(`/api/jobs/${queueName}/${jobId}`);
  },
};
