import { apiRequest } from '@/lib/api/client';
import type {
  InvestigationProfile,
  Victim,
  Accused,
  Witness,
  Vehicle,
  SeizedItem,
  MedicalInformation,
  CourtInformation,
} from '@/lib/api/types';

export const investigationProfileClient = {
  get(caseId: string): Promise<InvestigationProfile | null> {
    return apiRequest<InvestigationProfile | null>(`/api/cases/${caseId}/profile`);
  },

  upsert(caseId: string, data: any): Promise<InvestigationProfile> {
    return apiRequest<InvestigationProfile>(`/api/cases/${caseId}/profile`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Victims
  addVictim(caseId: string, data: any): Promise<Victim> {
    return apiRequest<Victim>(`/api/cases/${caseId}/profile/victims`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateVictim(caseId: string, id: string, data: any): Promise<Victim> {
    return apiRequest<Victim>(`/api/cases/${caseId}/profile/victims/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteVictim(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/profile/victims/${id}`, {
      method: 'DELETE',
    });
  },

  // Accused
  addAccused(caseId: string, data: any): Promise<Accused> {
    return apiRequest<Accused>(`/api/cases/${caseId}/profile/accused`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateAccused(caseId: string, id: string, data: any): Promise<Accused> {
    return apiRequest<Accused>(`/api/cases/${caseId}/profile/accused/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteAccused(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/profile/accused/${id}`, {
      method: 'DELETE',
    });
  },

  // Witnesses
  addWitness(caseId: string, data: any): Promise<Witness> {
    return apiRequest<Witness>(`/api/cases/${caseId}/profile/witnesses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateWitness(caseId: string, id: string, data: any): Promise<Witness> {
    return apiRequest<Witness>(`/api/cases/${caseId}/profile/witnesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteWitness(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/profile/witnesses/${id}`, {
      method: 'DELETE',
    });
  },

  // Vehicles
  addVehicle(caseId: string, data: any): Promise<Vehicle> {
    return apiRequest<Vehicle>(`/api/cases/${caseId}/profile/vehicles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateVehicle(caseId: string, id: string, data: any): Promise<Vehicle> {
    return apiRequest<Vehicle>(`/api/cases/${caseId}/profile/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteVehicle(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/profile/vehicles/${id}`, {
      method: 'DELETE',
    });
  },

  // Seized Items
  addSeizedItem(caseId: string, data: any): Promise<SeizedItem> {
    return apiRequest<SeizedItem>(`/api/cases/${caseId}/profile/seized-items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateSeizedItem(caseId: string, id: string, data: any): Promise<SeizedItem> {
    return apiRequest<SeizedItem>(`/api/cases/${caseId}/profile/seized-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteSeizedItem(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/profile/seized-items/${id}`, {
      method: 'DELETE',
    });
  },

  // Medical
  addMedicalInfo(caseId: string, data: any): Promise<MedicalInformation> {
    return apiRequest<MedicalInformation>(`/api/cases/${caseId}/profile/medical`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateMedicalInfo(caseId: string, id: string, data: any): Promise<MedicalInformation> {
    return apiRequest<MedicalInformation>(`/api/cases/${caseId}/profile/medical/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteMedicalInfo(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/profile/medical/${id}`, {
      method: 'DELETE',
    });
  },

  // Court
  addCourtInfo(caseId: string, data: any): Promise<CourtInformation> {
    return apiRequest<CourtInformation>(`/api/cases/${caseId}/profile/court`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateCourtInfo(caseId: string, id: string, data: any): Promise<CourtInformation> {
    return apiRequest<CourtInformation>(`/api/cases/${caseId}/profile/court/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteCourtInfo(caseId: string, id: string): Promise<void> {
    return apiRequest<void>(`/api/cases/${caseId}/profile/court/${id}`, {
      method: 'DELETE',
    });
  },
};
