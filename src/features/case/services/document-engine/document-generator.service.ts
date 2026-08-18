import { DocumentType, AIRequestType, ActivityType } from "@/generated/prisma/client";
import { CaseRepository } from "@/features/case/repositories/case.repository";
import { unifiedContextService } from "@/features/case/services/unified-context.service";
import { lawRetriever } from "@/ai/retrievers/law.retriever";
import { geminiProvider } from "@/ai/providers/gemini-provider";
import { 
  aiObservabilityService, 
  generatedDocumentService 
} from "@/services/shared/ai-shared.service";
import { activityService } from "@/features/case/services/activity.service";
import { DocumentRegistry } from "./document-registry";
import { prisma } from "@/lib/prisma";
import { documentRepository } from "@/features/case/repositories/document.repository";
import { redisKeys } from "@/lib/redis/redis-keys";
import { withRedisLock } from "@/lib/redis/redis-lock";
import { NonRetryableError } from "@/lib/error/retryable-error";
import {
  DocumentGenerationError,
  buildRepairPrompt,
  documentTypeLabel,
  formatDocumentValidationError,
} from "@/lib/error/document-error";
import { ZodError, z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Whether the document engine may attempt a single bounded repair re-prompt
 * when the AI output fails to parse/validate. Disable via DOCGEN_REPAIR_RETRY=false.
 */
const DOC_GEN_REPAIR_RETRY_ENABLED = process.env.DOCGEN_REPAIR_RETRY !== "false";
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

    // 240s TTL so the optional repair re-prompt (2 Gemini calls) cannot outlive the lock.
    return withRedisLock(lockKey, 240_000, async () => {
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

      // Validate required entities for specific document types.
      // Fail fast with a friendly, actionable error instead of spending a Gemini
      // call that is guaranteed to fail schema validation downstream.
      if (type === DocumentType.CHARGE_SHEET) {
        const hasAccused = (context.persons || []).some((p: any) => p.role === "SUSPECT") || 
                           (context.accused && context.accused.length > 0);
        if (!hasAccused) {
          throw new DocumentGenerationError(
            "Cannot generate a Charge Sheet without at least one identified Accused person.",
            {
              code: "CASE_DATA_MISSING",
              failureType: "data",
              userMessage: "A Charge Sheet requires at least one identified accused person. Add a person with role Suspect/Accused, then regenerate.",
            },
          );
        }
      }

      if (type === DocumentType.FIR) {
        const hasVictim = (context.persons || []).some((p: any) => p.role === "VICTIM") || 
                          (context.victims && context.victims.length > 0);
        if (!hasVictim) {
          throw new DocumentGenerationError(
            "Cannot generate an FIR without an identified Victim or Complainant.",
            {
              code: "CASE_DATA_MISSING",
              failureType: "data",
              userMessage: "An FIR requires an identified victim or complainant. Add a person with role Victim, then regenerate.",
            },
          );
        }
      }

      if (type === DocumentType.REMAND_REQUEST) {
        const hasArrestedAccused = (context.accused || []).some((a: any) => {
          const status = String(a.arrestStatus || "").toLowerCase();
          return /arrest|custody|remand|apprehend|taken into|held|detain/.test(status);
        });
        if (!hasArrestedAccused) {
          throw new DocumentGenerationError(
            "Cannot generate a Remand Request without an arrested accused person.",
            {
              code: "CASE_DATA_MISSING",
              failureType: "data",
              userMessage: "A Remand Request requires at least one accused person who has been arrested (arrest status like 'Arrested' or 'In Custody'). Add the accused person with their arrest details, then try again.",
            },
          );
        }
      }

      // 4. Retrieve legal context from PGVector if required
      //    RAG failure is non-fatal — the AI can still generate a document without legal context.
      let retrievedChunks: any[] = [];
      if (config.requiresRAG) {
        logger.info(
          { caseId, userId, documentType: type },
          "Querying PGVector legal retrieval",
        );
        try {
          retrievedChunks = await lawRetriever.retrieve(context.narrative, 5);
          logger.info(
            { caseId, userId, documentType: type, chunksCount: retrievedChunks.length },
            "Retrieved law sections from PGVector",
          );
        } catch (ragErr) {
          logger.warn(
            { err: ragErr, caseId, userId, documentType: type },
            "RAG retrieval failed — continuing without legal context"
          );
          retrievedChunks = [];
        }
      }

      // Report: RETRIEVING_CONTEXT
      await onProgress?.("RETRIEVING_CONTEXT", 40, "Retrieved legal context, building prompt.");

      // 5. Build the LLM prompt
      const basePrompt = config.buildPrompt(context, retrievedChunks);
      const promptText = `${PROMPT_SECURITY_INSTRUCTIONS}\n\n${basePrompt}`;

      // Report: GENERATING
      await onProgress?.("GENERATING", 60, "Generating document with AI model.");

      // 6+7. Call Gemini and validate the output, with a single bounded repair attempt
      const modelUsed = geminiProvider.getModelName();
      logger.info(
        { caseId, userId, documentType: type, modelUsed },
        "Dispatching prompt to Gemini model",
      );
      const generated = await this.generateValidatedOutput(
        promptText,
        config.schema,
        type,
      );
      const { result, rawResponse, latencyMs, tokenUsage, repaired, promptUsed } = generated;
      if (repaired) {
        logger.warn(
          { caseId, userId, documentType: type, latencyMs },
          "Document AI output repaired after validation feedback",
        );
      } else {
        logger.info(
          { caseId, userId, documentType: type, modelUsed, latencyMs },
          "Gemini responded to prompt",
        );
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

        // b. Query latest document version:
        //    - Same requestId → job retry → overwrite same version
        //    - New requestId with existing docs → regeneration → increment version
        //    - No docs → first-time → version 1
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
            // Same requestId → job retry → overwrite same version
            nextVer = existingDoc.version;
            logger.info(
              { caseId, userId, documentType: type, requestId, version: nextVer },
              "Found existing document for requestId, deleting version to overwrite",
            );
            await tx.generatedDocument.delete({
              where: { id: existingDoc.id },
            });
          } else if (docs.length > 0) {
            // New requestId with existing docs → regeneration → increment version
            const maxVersion = Math.max(...docs.map((d) => d.version));
            nextVer = maxVersion + 1;
            logger.info(
              { caseId, userId, documentType: type, existingCount: docs.length, nextVersion: nextVer },
              "Regeneration detected — deleting all existing documents and creating new version",
            );
            await tx.generatedDocument.deleteMany({
              where: { caseId, type },
            });
          }
          // else: first-time generation via worker → version 1 (default)
        } else {
          // Sync (non-worker) path: increment version
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
          prompt: promptUsed,
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

      // Report: COMPLETED — non-critical, must not crash the transaction success
      try {
        await onProgress?.("COMPLETED", 100, "Document generation completed.");
      } catch (progressErr) {
        logger.warn(
          { err: progressErr, caseId, userId, documentType: type },
          "Progress callback failed after document save — non-fatal"
        );
      }

      return document;
    });
  }

  /**
   * Calls Gemini and validates the response against the registered schema.
   * Performs exactly one bounded repair attempt when the output fails to
   * parse/validate, then throws a structured DocumentGenerationError.
   */
  private async generateValidatedOutput<T>(
    promptText: string,
    schema: z.ZodType<T>,
    type: DocumentType,
  ): Promise<{
    result: T;
    rawResponse: string;
    promptUsed: string;
    latencyMs: number;
    tokenUsage?: number;
    repaired: boolean;
  }> {
    const totalStart = Date.now();
    const initial = await geminiProvider.generateJSON(promptText);

    const firstAttempt = this.parseAndValidate(schema, initial.text);
    if (firstAttempt.ok) {
      return {
        result: firstAttempt.result,
        rawResponse: initial.text,
        promptUsed: promptText,
        latencyMs: Date.now() - totalStart,
        tokenUsage: initial.tokenUsage,
        repaired: false,
      };
    }

    // Single bounded repair attempt — re-prompt with the schema feedback.
    if (DOC_GEN_REPAIR_RETRY_ENABLED) {
      const repairPrompt = buildRepairPrompt(
        promptText,
        initial.text,
        firstAttempt.issues,
      );
      logger.warn(
        { documentType: type, issueCount: firstAttempt.issues.length },
        "Attempting to repair document AI output",
      );
      try {
        const repaired = await geminiProvider.generateJSON(repairPrompt);
        const repairedAttempt = this.parseAndValidate(schema, repaired.text);
        if (repairedAttempt.ok) {
          return {
            result: repairedAttempt.result,
            rawResponse: repaired.text,
            promptUsed: repairPrompt,
            latencyMs: Date.now() - totalStart,
            tokenUsage: repaired.tokenUsage,
            repaired: true,
          };
        }
        logger.warn(
          { documentType: type, issueCount: repairedAttempt.issues.length },
          "Document repair attempt still failed validation",
        );
      } catch (repairErr) {
        logger.warn(
          { err: repairErr, documentType: type },
          "Document repair attempt errored — falling back to original failure",
        );
      }
    }

    throw this.buildValidationError(type, firstAttempt.error);
  }

  private parseAndValidate<T>(
    schema: z.ZodType<T>,
    text: string,
  ):
    | { ok: true; result: T; error: null; issues: [] }
    | { ok: false; result: null; error: Error; issues: any[] } {
    try {
      const rawData = JSON.parse(text);
      const result = schema.parse(rawData);
      return { ok: true, result, error: null, issues: [] };
    } catch (error: any) {
      const issues = Array.isArray(error?.issues) ? (error.issues as any[]) : [];
      return { ok: false, result: null, error, issues };
    }
  }

  private buildValidationError(
    type: DocumentType,
    error: Error,
  ): DocumentGenerationError {
    if (error instanceof ZodError) {
      const formatted = formatDocumentValidationError(type, error);
      return new DocumentGenerationError(formatted.message, {
        code: "VALIDATION_FAILED",
        failureType: "validation",
        userMessage: formatted.userMessage,
        details: formatted.details,
      });
    }
    return new DocumentGenerationError(
      `Failed to parse ${type} AI output: the model returned malformed JSON.`,
      {
        code: "VALIDATION_FAILED",
        failureType: "validation",
        userMessage: `The AI returned a response that could not be read as a valid ${documentTypeLabel(type)}. Please try again.`,
        details: { parseError: error?.message },
      },
    );
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
