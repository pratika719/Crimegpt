import { apiRequest } from '@/lib/api/client';
import type { Person, PersonRole } from '@/lib/api/types';

export interface CreatePersonInput {
  name: string;
  role: PersonRole;
  phone?: string | null;
  address?: string | null;
  statement?: string | null;
  notes?: string | null;
}

export interface UpdatePersonInput {
  name?: string;
  role?: PersonRole;
  phone?: string | null;
  address?: string | null;
  statement?: string | null;
  notes?: string | null;
}

export const personClient = {
  list(caseId: string): Promise<Person[]> {
    return apiRequest<Person[]>(`/api/cases/${caseId}/persons`);
  },

  get(caseId: string, id: string): Promise<Person> {
    return apiRequest<Person>(`/api/cases/${caseId}/persons/${id}`);
  },

  create(caseId: string, input: CreatePersonInput): Promise<Person> {
    return apiRequest<Person>(`/api/cases/${caseId}/persons`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(caseId: string, id: string, input: UpdatePersonInput): Promise<Person> {
    return apiRequest<Person>(`/api/cases/${caseId}/persons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  remove(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/persons/${id}`, {
      method: 'DELETE',
    });
  },
};
