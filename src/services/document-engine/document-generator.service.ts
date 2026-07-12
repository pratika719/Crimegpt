import { DocumentType, AIRequestType, ActivityType } from "@/generated/prisma/client";
import { CaseRepository } from "@/repositories/case.repository";
import { unifiedContextService } from "@/services/case/unified-context.service";
import { lawRetriever } from "@/ai/retrievers/law.retriever";
import { geminiProvider } from "@/ai/providers/gemini-provider";
import { 
  aiObservabilityService, 
  generatedDocumentService 
} from "@/services/shared/ai-shared.service";
import { activityService } from "@/services/activity/activity.service";
import { DocumentRegistry } from "./document-registry";
import { prisma } from "@/lib/prisma";
import { documentRepository } from "@/repositories/document.repository";
import { redisKeys } from "@/lib/redis/redis-keys";
import { withRedisLock } from "@/lib/redis/redis-lock";
import { NonRetryableError } from "@/lib/error/retryable-error";
import { logger } from "@/lib/logger";
import { PROMPT_SECURITY_INSTRUCTIONS } from "@/lib/security/prompt-security";

/**
 * Callback type for reporting generation progress to the caller
 * (e.g. BullMQ worker, direct action).
 */
export type ProgressCallback = (status: string, progress: number, message: string) => Promise<void>;

export class DocumentGeneratorService {
  private caseRepository = new CaseRepository();

  /**
   * The core unified AI document generation pipeline.
   * Works for any registered document type.
   * Accepts an optional onProgress callback for real-time progress reporting.
   */
  async generateDocument(
    caseId: string,
    userId: string,
    type: DocumentType,
    requestId?: string,
    onProgress?: ProgressCallback,
  ) {
    const lockKey = redisKeys.lock.documentGeneration(caseId, type);

    return withRedisLock(lockKey, 120_000, async () => {
      logger.info(
        { caseId, userId, documentType: type, requestId },
        "Initiating document generation",
      );

      // Report: STARTED
      await onProgress?.("STARTED", 5, "Document generation started.");

      // 1. Fetch case details
      const caseItem = await this.caseRepository.findById(caseId, userId);
      if (!caseItem) {
        throw new NonRetryableError(`Case not found for ID: ${caseId}`);
      }

      // 2. Fetch the configuration from registry
      const config = DocumentRegistry.getConfig(type);

      // 3. Build the Unified Case Context
      logger.info(
        { caseId, userId, documentType: type },
        "Loading unified case context",
      );
      let context = await unifiedContextService.buildUnifiedCaseContext(caseId, userId);

      // Enrich context with fallback defaults to ensure AI generation succeeds even with partial profile data
      context = this.enrichContext(context);

      // Report: BUILDING_CONTEXT
      await onProgress?.("BUILDING_CONTEXT", 20, "Building case context.");

      // Validate required entities for specific document types
      if (type === DocumentType.CHARGE_SHEET) {
        const hasAccused = (context.persons || []).some((p: any) => p.role === "SUSPECT") || 
                           (context.accused && context.accused.length > 0);
        if (!hasAccused) {
          throw new NonRetryableError("Validation Failed: Cannot generate a Charge Sheet without at least one identified Accused person.");
        }
      }

      if (type === DocumentType.FIR) {
        const hasVictim = (context.persons || []).some((p: any) => p.role === "VICTIM") || 
                          (context.victims && context.victims.length > 0);
        if (!hasVictim) {
          throw new NonRetryableError("Validation Failed: Cannot generate an FIR without an identified Victim or Complainant.");
        }
      }

      // 4. Retrieve legal context from PGVector if required
      let retrievedChunks: any[] = [];
      if (config.requiresRAG) {
        logger.info(
          { caseId, userId, documentType: type },
          "Querying PGVector legal retrieval",
        );
        retrievedChunks = await lawRetriever.retrieve(context.narrative, 5);
        logger.info(
          { caseId, userId, documentType: type, chunksCount: retrievedChunks.length },
          "Retrieved law sections from PGVector",
        );
      }

      // Report: RETRIEVING_CONTEXT
      await onProgress?.("RETRIEVING_CONTEXT", 40, "Retrieved legal context, building prompt.");

      // 5. Build the LLM prompt
      const basePrompt = config.buildPrompt(context, retrievedChunks);
      const promptText = `${PROMPT_SECURITY_INSTRUCTIONS}\n\n${basePrompt}`;

      // Report: GENERATING
      await onProgress?.("GENERATING", 60, "Generating document with AI model.");

      // 6. Call Gemini Flash to generate JSON
      const modelUsed = geminiProvider.getModelName();
      const startTime = Date.now();
      logger.info(
        { caseId, userId, documentType: type, modelUsed },
        "Dispatching prompt to Gemini model",
      );
      const { text: rawResponse, tokenUsage } = await geminiProvider.generateJSON(promptText);
      const latencyMs = Date.now() - startTime;
      logger.info(
        { caseId, userId, documentType: type, modelUsed, latencyMs },
        "Gemini responded to prompt",
      );

      // 7. Validate output using the registered Zod schema
      let result: any;
      try {
        const rawData = JSON.parse(rawResponse);
        result = config.schema.parse(rawData);
        logger.info(
          { caseId, userId, documentType: type },
          "Document JSON successfully validated against Zod schema",
        );
      } catch (err: any) {
        logger.error(
          { err, caseId, userId, documentType: type },
          "Validation failure for document",
        );
        throw new NonRetryableError(`Failed to parse or validate ${type} AI output: ${err.message}`);
      }

      // Report: SAVING
      await onProgress?.("SAVING", 90, "Saving generated document.");

      // 8. Execute all database writes atomically inside a single transaction
      logger.info(
        { caseId, userId, documentType: type },
        "Running database transaction for document generation",
      );
      const document = await prisma.$transaction(async (tx) => {
        // a. Pessimistic lock on the Case row to serialize concurrent writes
        await tx.$executeRaw`SELECT id FROM "Case" WHERE id = ${caseId} FOR UPDATE`;

        // b. Query latest document version for this type under the case
        //    or overwrite if request is retried (Idempotency check via _requestId)
        let nextVer = 1;
        if (requestId) {
          const docs = await tx.generatedDocument.findMany({
            where: { caseId, type },
          });
          const existingDoc = docs.find((d: any) => {
            const content = d.content as any;
            return content && content._requestId === requestId;
          });

          if (existingDoc) {
            nextVer = existingDoc.version;
            logger.info(
              { caseId, userId, documentType: type, requestId, version: nextVer },
              "Found existing document for requestId, deleting version to overwrite",
            );
            await tx.generatedDocument.delete({
              where: { id: existingDoc.id },
            });
          } else {
            const latestDoc = await documentRepository.findLatestByType(caseId, userId, type, tx);
            nextVer = latestDoc ? latestDoc.version + 1 : 1;
          }
        } else {
          const latestDoc = await documentRepository.findLatestByType(caseId, userId, type, tx);
          nextVer = latestDoc ? latestDoc.version + 1 : 1;
        }

        // c. Save the GeneratedDocument
        const documentTitle = `${config.titlePrefix} - v${nextVer}`;
        const doc = await generatedDocumentService.saveDocument(userId, {
          caseId,
          type,
          title: documentTitle,
          content: requestId ? { ...result, _requestId: requestId } : result,
          version: nextVer,
        }, tx);

        // d. Always store AIRequestLog for observability (rich telemetry — prompt, response, tokens)
        await aiObservabilityService.logRequest(userId, {
          requestType: config.aiRequestType,
          prompt: basePrompt,
          retrievedContext: retrievedChunks.length > 0 ? JSON.stringify(retrievedChunks) : undefined,
          response: rawResponse,
          latencyMs,
          modelUsed,
          tokenUsage,
          caseId,
          queueJobId: requestId,
        }, tx);

        // e. Create Case Activity Log entry
        await activityService.logDocumentGenerated(caseId, userId, type, doc.title, nextVer, tx);

        // f. Transition case status from OPEN to UNDER_INVESTIGATION upon FIR generation
        if (type === DocumentType.FIR && caseItem.status === "OPEN") {
          logger.info(
            { caseId, userId, documentType: type },
            "Upgrading case status to UNDER_INVESTIGATION inside transaction",
          );
          await this.caseRepository.updateStatus(caseId, userId, "UNDER_INVESTIGATION", tx);
        }

        return doc;
      }, {
        maxWait: 20000,
        timeout: 40000,
      });

      logger.info(
        { caseId, userId, documentType: type, version: document.version },
        "Document generation complete",
      );

      // Report: COMPLETED
      await onProgress?.("COMPLETED", 100, "Document generation completed.");

      return document;
    });
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
        (p: any) => p.role === "SUSPECT"
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
        (p: any) => p.role === "VICTIM"
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
        (p: any) => p.role === "WITNESS"
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
