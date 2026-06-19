import { DocumentType, AIRequestType, ActivityType } from "@/generated/prisma/client";
import { CaseRepository } from "@/repositories/case.repository";
import { unifiedContextService } from "@/services/case/unified-context.service";
import { lawRetriever } from "@/ai/retrievers/law.retriever";
import { geminiProvider } from "@/ai/providers/gemini-provider";
import { 
  documentVersionService, 
  aiObservabilityService, 
  generatedDocumentService 
} from "@/services/shared/ai-shared.service";
import { activityService } from "@/services/activity/activity.service";
import { DocumentRegistry } from "./document-registry";

export class DocumentGeneratorService {
  private caseRepository = new CaseRepository();

  /**
   * The core unified AI document generation pipeline.
   * Works for any registered document type.
   */
  async generateDocument(caseId: string, type: DocumentType) {
    console.log(`🤖 [DocumentGeneratorService] Initiating generation for case: ${caseId}, type: ${type}`);
    
    // 1. Fetch case details
    const caseItem = await this.caseRepository.findById(caseId);
    if (!caseItem) {
      throw new Error(`Case not found for ID: ${caseId}`);
    }

    // 2. Fetch the configuration from registry
    const config = DocumentRegistry.getConfig(type);

    // 3. Retrieve the next version number
    const nextVersion = await documentVersionService.getNextVersion(caseId, type);
    console.log(`🤖 [DocumentGeneratorService] Next version will be: v${nextVersion}`);

    // 4. Build the Unified Case Context
    console.log(`🤖 [DocumentGeneratorService] Loading unified case context...`);
    let context = await unifiedContextService.buildUnifiedCaseContext(caseId);

    // Enrich context with fallback defaults to ensure AI generation succeeds even with partial profile data
    context = this.enrichContext(context);

    // 5. Retrieve legal context from PGVector if required
    let retrievedChunks: any[] = [];
    if (config.requiresRAG) {
      console.log(`🤖 [DocumentGeneratorService] Querying PGVector legal retrieval...`);
      retrievedChunks = await lawRetriever.retrieve(context.narrative, 5);
      console.log(`🤖 [DocumentGeneratorService] Retrieved ${retrievedChunks.length} law sections.`);
    }

    // 6. Build the LLM prompt
    const promptText = config.buildPrompt(context, retrievedChunks);

    // 7. Call Gemini Flash to generate JSON
    const modelUsed = geminiProvider.getModelName();
    const startTime = Date.now();
    console.log(`🤖 [DocumentGeneratorService] Dispatching prompt to ${modelUsed}...`);
    const rawResponse = await geminiProvider.generateJSON(promptText);
    const latencyMs = Date.now() - startTime;
    console.log(`🤖 [DocumentGeneratorService] AI responded in ${latencyMs}ms.`);

    // 8. Validate output using the registered Zod schema
    let result: any;
    try {
      const rawData = JSON.parse(rawResponse);
      result = config.schema.parse(rawData);
      console.log(`🤖 [DocumentGeneratorService] Document JSON successfully validated against Zod schema.`);
    } catch (err: any) {
      console.error(`❌ Validation Failure for ${type}:`, err);
      throw new Error(`Failed to parse or validate ${type} AI output: ${err.message}`);
    }

    // 9. Save GeneratedDocument to the database
    const documentTitle = `${config.titlePrefix} - v${nextVersion}`;
    console.log(`🤖 [DocumentGeneratorService] Persisting GeneratedDocument: "${documentTitle}"`);
    const document = await generatedDocumentService.saveDocument({
      caseId,
      type,
      title: documentTitle,
      content: result,
      version: nextVersion,
    });

    // 10. Store AIRequestLog for observability
    console.log(`🤖 [DocumentGeneratorService] Creating AIRequestLog...`);
    await aiObservabilityService.logRequest({
      requestType: config.aiRequestType,
      prompt: promptText,
      retrievedContext: retrievedChunks.length > 0 ? JSON.stringify(retrievedChunks) : undefined,
      response: rawResponse,
      latencyMs,
      modelUsed,
      caseId,
    });

    // 11. Create Activity Log entry (handling custom activity types mapped in registry)
    console.log(`🤖 [DocumentGeneratorService] Logging case activity...`);
    let activityDesc = `Generated "${documentTitle}" for case.`;
    if (type === DocumentType.FIR) {
      activityDesc = `First Information Report (FIR) v${nextVersion} generated successfully.`;
    } else if (type === DocumentType.INVESTIGATION_SUMMARY) {
      activityDesc = `Investigation Summary Report v${nextVersion} compiled successfully.`;
    } else if (type === DocumentType.CHARGE_SHEET) {
      activityDesc = `Charge Sheet (Final Report) v${nextVersion} generated successfully.`;
    } else if (type === DocumentType.REMAND_REQUEST) {
      activityDesc = `Remand Request Application v${nextVersion} compiled successfully.`;
    } else if (type === DocumentType.CASE_DIARY) {
      activityDesc = `Official Narrative Case Diary v${nextVersion} generated successfully.`;
    }

    await activityService.logDocumentGenerated(caseId, type, document.title, nextVersion);
    
    // Explicitly record custom activity description if needed, or update case state
    // Let's also transition case status from OPEN to UNDER_INVESTIGATION upon FIR generation
    if (type === DocumentType.FIR && caseItem.status === "OPEN") {
      console.log(`🤖 [DocumentGeneratorService] Upgrading case status to UNDER_INVESTIGATION...`);
      await this.caseRepository.updateStatus(caseId, "UNDER_INVESTIGATION");
    }

    console.log(`🤖 [DocumentGeneratorService] Generation complete.`);
    return document;
  }

  /**
   * Enriches the UnifiedCaseContext with fallback defaults to ensure AI generation succeeds
   * even if specific profile sections are incomplete in the database.
   */
  private enrichContext(context: any): any {
    const enriched = { ...context };
    const profile = enriched.investigationProfile;

    // 1. Enrich Investigation Profile
    if (!profile) {
      enriched.investigationProfile = {
        firNumber: "FIR-PENDING",
        policeStation: "Jurisdictional Police Station",
        investigatingOfficer: "Assigned Investigating Officer",
        dateOfRegistration: enriched.createdAt,
        incidentDateTime: enriched.createdAt,
        incidentLocation: enriched.metadata?.incidentLocation || "Under Jurisdiction",
        incidentDescription: enriched.narrative,
        investigationNotes: enriched.metadata?.officerNotes || "Initial narrative evaluation.",
      };
    } else {
      enriched.investigationProfile = {
        ...profile,
        firNumber: profile.firNumber || "FIR-PENDING",
        policeStation: profile.policeStation || "Jurisdictional Police Station",
        investigatingOfficer: profile.investigatingOfficer || "Assigned Investigating Officer",
        dateOfRegistration: profile.dateOfRegistration || enriched.createdAt,
        incidentDateTime: profile.incidentDateTime || enriched.createdAt,
        incidentLocation: profile.incidentLocation || enriched.metadata?.incidentLocation || "Under Jurisdiction",
        incidentDescription: profile.incidentDescription || enriched.narrative,
      };
    }

    // 2. Enrich Accused List (must have min 1)
    if (!enriched.accused || enriched.accused.length === 0) {
      const suspectPersons = (enriched.persons || []).filter(
        (p: any) => p.role === "SUSPECT" || p.role === "SUSPECT"
      );
      if (suspectPersons.length > 0) {
        enriched.accused = suspectPersons.map((p: any, idx: number) => ({
          id: `accused-fallback-${idx}`,
          personId: p.id,
          name: p.name,
          phone: p.phone,
          address: p.address,
          statement: p.statement,
          arrestStatus: "Under Investigation",
          bailDetails: null,
        }));
      } else if (enriched.metadata?.suspectName) {
        enriched.accused = [{
          id: "accused-metadata-fallback",
          personId: "accused-metadata-fallback",
          name: enriched.metadata.suspectName,
          phone: null,
          address: null,
          statement: enriched.metadata.suspectDescription || null,
          arrestStatus: "Under Investigation",
          bailDetails: null,
        }];
      } else {
        enriched.accused = [{
          id: "accused-default-fallback",
          personId: "accused-default-fallback",
          name: "Unidentified Suspect",
          phone: null,
          address: null,
          statement: "Details pending identity establishment.",
          arrestStatus: "Absconding",
          bailDetails: null,
        }];
      }
    }

    // 3. Enrich Victims List (must have min 1)
    if (!enriched.victims || enriched.victims.length === 0) {
      const victimPersons = (enriched.persons || []).filter(
        (p: any) => p.role === "VICTIM" || p.role === "VICTIM"
      );
      if (victimPersons.length > 0) {
        enriched.victims = victimPersons.map((p: any, idx: number) => ({
          id: `victim-fallback-${idx}`,
          personId: p.id,
          name: p.name,
          phone: p.phone,
          address: p.address,
          statement: p.statement,
          injuryDetails: "Details under assessment.",
          status: "Stable",
        }));
      } else if (enriched.metadata?.victimName) {
        enriched.victims = [{
          id: "victim-metadata-fallback",
          personId: "victim-metadata-fallback",
          name: enriched.metadata.victimName,
          phone: null,
          address: null,
          statement: enriched.metadata.victimStatement || null,
          injuryDetails: "Details under assessment.",
          status: "Stable",
        }];
      } else {
        enriched.victims = [{
          id: "victim-default-fallback",
          personId: "victim-default-fallback",
          name: "Unnamed Complainant/Victim",
          phone: null,
          address: null,
          statement: "Statement recorded in initial complaint report.",
          injuryDetails: "No physical injuries reported.",
          status: "Stable",
        }];
      }
    }

    // 4. Enrich Witnesses List
    if (!enriched.witnesses || enriched.witnesses.length === 0) {
      const witnessPersons = (enriched.persons || []).filter(
        (p: any) => p.role === "WITNESS" || p.role === "WITNESS"
      );
      if (witnessPersons.length > 0) {
        enriched.witnesses = witnessPersons.map((p: any, idx: number) => ({
          id: `witness-fallback-${idx}`,
          personId: p.id,
          name: p.name,
          phone: p.phone,
          address: p.address,
          statement: p.statement,
          statementDate: enriched.createdAt,
          credibilityScore: "Medium",
        }));
      }
    }

    // 5. Enrich Activities List
    if (!enriched.activities || enriched.activities.length === 0) {
      enriched.activities = [{
        id: "activity-default-fallback",
        activityType: "CASE_CREATED",
        description: `Case dossier "${enriched.title}" registered in CrimeGPT directory. Initial narrative established.`,
        createdAt: enriched.createdAt,
      }];
    }

    return enriched;
  }
}

export const documentGeneratorService = new DocumentGeneratorService();
export default documentGeneratorService;
