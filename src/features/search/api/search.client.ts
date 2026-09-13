import { apiRequest } from '@/lib/api/client';
import type { SearchResultDTO } from '@/lib/api/types';

export const searchClient = {
  search(query: string): Promise<{ results: SearchResultDTO[] }> {
    const encoded = encodeURIComponent(query.trim());
    return apiRequest<{ results: SearchResultDTO[] }>(`/api/search?q=${encoded}`);
  },
};
