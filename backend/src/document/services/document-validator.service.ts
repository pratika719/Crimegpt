import { Injectable } from '@nestjs/common';
import { DocumentType } from '../document-registry';

@Injectable()
export class DocumentValidatorService {
  /**
   * Validates that required entities are present before attempting generation.
   * Fails fast if essential criteria for the specific document type are not met.
   */
  validateEntities(context: any, type: DocumentType): void {
    if (type === DocumentType.FIR) {
      const hasVictim =
        context.persons?.some((p: any) => p.role === 'VICTIM') ||
        (context.victims?.length ?? 0) > 0;
      if (!hasVictim) {
        throw new Error('Cannot generate an FIR without an identified Victim or Complainant.');
      }
    }

    if (type === DocumentType.CHARGE_SHEET) {
      const hasAccused =
        context.persons?.some((p: any) => p.role === 'SUSPECT') ||
        (context.accused?.length ?? 0) > 0;
      if (!hasAccused) {
        throw new Error('Cannot generate a Charge Sheet without at least one identified Accused person.');
      }
    }

    if (type === DocumentType.REMAND_REQUEST) {
      const hasArrested = context.accused?.some((a: any) =>
        /arrest|custody|remand|apprehend|taken into|held|detain/i.test(String(a.arrestStatus || '')),
      );
      if (!hasArrested) {
        throw new Error('Cannot generate a Remand Request without an arrested accused person.');
      }
    }
  }

  /**
   * Enriches unified context with default fallback structures if missing.
   */
  enrichContext(context: any, type?: DocumentType): any {
    const enriched = { ...context };
    const profile = enriched.investigationProfile;

    // Enrich Investigation Profile
    if (!profile) {
      enriched.investigationProfile = {
        firNumber: 'FIR-PENDING',
        policeStation: 'Jurisdictional Police Station',
        investigatingOfficer: 'Assigned Investigating Officer',
        dateOfRegistration: enriched.createdAt,
        incidentDateTime: enriched.createdAt,
        incidentLocation: enriched.metadata?.incidentLocation || 'Under Jurisdiction',
        incidentDescription: enriched.narrative,
        investigationNotes: enriched.metadata?.officerNotes || 'Initial narrative evaluation.',
      };
    }

    // Enrich Accused
    const isRemand = type === DocumentType.REMAND_REQUEST;
    const defaultArrestStatus = isRemand ? 'Arrested (In Custody)' : 'Under Investigation';

    if (!enriched.accused || enriched.accused.length === 0) {
      const suspectPersons = (enriched.persons || []).filter((p: any) => p.role === 'SUSPECT');
      if (suspectPersons.length > 0) {
        enriched.accused = suspectPersons.map((p: any, idx: number) => ({
          id: `accused-fallback-${idx}`,
          personId: p.id,
          name: p.name,
          phone: p.phone,
          address: p.address,
          statement: p.statement,
          arrestStatus: defaultArrestStatus,
          bailDetails: null,
        }));
      } else {
        enriched.accused = [{
          id: 'accused-default-fallback',
          personId: 'accused-default-fallback',
          name: 'Unidentified Suspect',
          phone: null,
          address: null,
          statement: 'Details pending identity establishment.',
          arrestStatus: isRemand ? 'Arrested (In Custody)' : 'Absconding',
          bailDetails: null,
        }];
      }
    }

    // Enrich Victims
    if (!enriched.victims || enriched.victims.length === 0) {
      const victimPersons = (enriched.persons || []).filter((p: any) => p.role === 'VICTIM');
      if (victimPersons.length > 0) {
        enriched.victims = victimPersons.map((p: any, idx: number) => ({
          id: `victim-fallback-${idx}`,
          personId: p.id,
          name: p.name,
          phone: p.phone,
          address: p.address,
          statement: p.statement,
          injuryDetails: 'Details under assessment.',
          status: 'Stable',
        }));
      } else {
        enriched.victims = [{
          id: 'victim-default-fallback',
          personId: 'victim-default-fallback',
          name: 'Unnamed Complainant/Victim',
          phone: null,
          address: null,
          statement: 'Statement recorded in initial complaint report.',
          injuryDetails: 'No physical injuries reported.',
          status: 'Stable',
        }];
      }
    }

    // Enrich Witnesses
    if (!enriched.witnesses || enriched.witnesses.length === 0) {
      const witnessPersons = (enriched.persons || []).filter((p: any) => p.role === 'WITNESS');
      if (witnessPersons.length > 0) {
        enriched.witnesses = witnessPersons.map((p: any, idx: number) => ({
          id: `witness-fallback-${idx}`,
          personId: p.id,
          name: p.name,
          phone: p.phone,
          address: p.address,
          statement: p.statement,
          statementDate: enriched.createdAt,
          credibilityScore: 'Medium',
        }));
      }
    }

    // Enrich Activities
    if (!enriched.activities || enriched.activities.length === 0) {
      enriched.activities = [{
        id: 'activity-default-fallback',
        activityType: 'CASE_CREATED',
        description: `Case dossier "${enriched.title}" registered. Initial narrative established.`,
        createdAt: enriched.createdAt,
      }];
    }

    return enriched;
  }
}
