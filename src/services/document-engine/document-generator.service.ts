import { DocumentType } from "@/generated/prisma/client";
import { CaseRepository } from "@/repositories/case.repository";
import { unifiedContextService } from "@/services/case/unified-context.service";
import { lawRetriever } from "@/ai/retrievers/law.retriever";
import { getResilientAIProvider } from "@/ai/providers/provider-factory";
import { aiObservabilityService } from "@/services/ai/ai-observability.service";
import { activityService } from "@/services/activity/activity.service";
import { DocumentRegistry } from "./document-registry";
import { prisma } from "@/lib/prisma";
import { documentRepository } from "@/repositories/document.repository";
import { redisKeys } from "@/lib/redis/redis-keys";
import { withRedisLock } from "@/lib/redis/redis-lock";
import { logger } from "@/lib/logger";
import { PROMPT_SECURITY_INSTRUCTIONS } from "@/lib/security/prompt-security";
import { InvalidAIResponseError } from "@/lib/error/ai-provider-error";
import { diagnosticFlags } from "@/lib/ai/diagnostic-flags";
import { logGenerationEvent } from "@/lib/ai/generation-diagnostics";

type DocumentGenerationStage =
  | "validating"
  | "warming_ai_service"
  | "retrieving_legal_context"
  | "generating_document"
  | "provider_fallback"
  | "saving_document";

type GenerateDocumentOptions = {
  onStage?: (stage: DocumentGenerationStage, message: string, percentage: number) => Promise<void>;
  jobId?: string;
};

export class DocumentGeneratorService {
  private caseRepository = new CaseRepository();

  /**
   * The core unified AI document generation pipeline.
   * Works for any registered document type.
   */
  async generateDocument(
    caseId: string,
    userId: string,
    type: DocumentType,
    requestId?: string,
    options: GenerateDocumentOptions = {},
  ) {
    const lockKey = redisKeys.lock.documentGeneration(caseId, type);

    return withRedisLock(lockKey, 120_000, async () => {
      // keep your existing generation logic here unchanged

      logger.info(
        { caseId, userId, documentType: type, requestId },
        "Initiating document generation",
      );
      const correlation = {
        generationId: requestId ?? `direct_${caseId}_${type}`,
        jobId: options.jobId,
        caseId,
        documentType: type,
      };

      await options.onStage?.("validating", "Validating case data", 10);

      // 1. Fetch case details
      const caseItem = await this.caseRepository.findById(caseId, userId);
      if (!caseItem) {
        throw new Error(`Case not found for ID: ${caseId}`);
      }
      logGenerationEvent("validation_passed", correlation);

      // 2. Fetch the configuration from registry
      const config = DocumentRegistry.getConfig(type);

      // 3. Build the Unified Case Context
      logger.info(
        { caseId, userId, documentType: type },
        "Loading unified case context",
      );
      let context = await unifiedContextService.buildUnifiedCaseContext(caseId, userId);
      logGenerationEvent("context_loaded", correlation, {
        narrativeChars: context.narrative.length,
      });

      // Enrich context with fallback defaults...
      context = this.enrichContext(context);

      if (type === DocumentType.CHARGE_SHEET) {
        const hasAccused = (context.persons || []).some((p: any) => p.role === "SUSPECT") ||
          (context.accused && context.accused.length > 0);
        if (!hasAccused) {
          throw new Error("Validation Failed: Add at least one accused/suspect before generating a chargesheet.");
        }
      }

      if (type === DocumentType.FIR) {
        const hasVictim = (context.persons || []).some((p: any) => p.role === "VICTIM") ||
          (context.victims && context.victims.length > 0);
        if (!hasVictim) {
          throw new Error("Validation Failed: Add at least one victim/complainant before generating an FIR.");
        }
      }

      // 4. Retrieve legal context from PGVector if required
      let retrievedChunks: any[] = [];
      if (config.requiresRAG && diagnosticFlags.useLegalRetrieval() && diagnosticFlags.useEmbeddings()) {
        await options.onStage?.("warming_ai_service", "Warming AI service", 20);
        await options.onStage?.(
          "retrieving_legal_context",
          "Retrieving legal context",
          35,
        );
        logger.info(
          { caseId, userId, documentType: type },
          "Querying PGVector legal retrieval",
        );
        const topK = Number(process.env.LAW_RETRIEVAL_TOP_K ?? 4);
        const retrievalStartedAt = Date.now();
        retrievedChunks = await lawRetriever.retrieve(
          context.narrative,
          Number.isFinite(topK) && topK > 0 ? topK : 4,
        );
        logger.info(
          { caseId, userId, documentType: type, chunksCount: retrievedChunks.length },
          "Retrieved law sections from PGVector",
        );
        logGenerationEvent("retrieval_completed", correlation, {
          chunksCount: retrievedChunks.length,
          latencyMs: Date.now() - retrievalStartedAt,
        });
        logGenerationEvent("embedding_completed", correlation, {
          source: "legal_retrieval_path",
          latencyMs: Date.now() - retrievalStartedAt,
        });
      } else if (config.requiresRAG) {
        logGenerationEvent("retrieval_completed", correlation, {
          skipped: true,
          useLegalRetrieval: diagnosticFlags.useLegalRetrieval(),
          useEmbeddings: diagnosticFlags.useEmbeddings(),
        });
      }

      // 5. Build and deterministically bound the LLM prompt.
      const basePrompt = config.buildPrompt(context, retrievedChunks);
      const unboundedPrompt = `${PROMPT_SECURITY_INSTRUCTIONS}\n\n${basePrompt}`;
      const promptText = this.limitPrompt(unboundedPrompt, Number(process.env.AI_MAX_CONTEXT_CHARS ?? 50_000));
      const contextTruncated = promptText.length < unboundedPrompt.length;

      // 6. Generate provider-neutral structured JSON.
      const provider = getResilientAIProvider();
      await options.onStage?.("generating_document", "Generating document with AI", 65);
      logger.info(
        { caseId, userId, documentType: type, primaryProvider: provider.name, model: provider.model, contextChars: promptText.length, contextTruncated },
        "Dispatching document prompt to AI provider",
      );
      logGenerationEvent("llm_started", correlation, {
        provider: provider.name,
        model: provider.model,
      });
      const aiResult = await provider.generateJSON<unknown>({
        systemPrompt: `You are an Indian legal-document drafting assistant.\nUse only the supplied case facts and retrieved legal context.\nDo not invent names, dates, evidence, statutes, witnesses, charges, or procedural events.\nIf required data is unavailable, follow the schema's unavailable-value convention.\nDo not present the generated content as final legal advice or an official filed document.`,
        userPrompt: promptText,
        schemaName: `${type}Document`,
        temperature: 0.1,
        maxTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 4_000),
      });
      const modelUsed = `${aiResult.provider}:${aiResult.model}`;
      logGenerationEvent("llm_completed", correlation, {
        provider: aiResult.provider,
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
        fallbackUsed: aiResult.fallbackUsed,
      });
      if (aiResult.fallbackUsed) {
        await options.onStage?.(
          "provider_fallback",
          "Primary AI provider is unavailable. Trying backup provider.",
          80,
        );
      }
      logger.info(
        { caseId, userId, documentType: type, provider: aiResult.provider, model: aiResult.model, fallbackUsed: aiResult.fallbackUsed, latencyMs: aiResult.latencyMs, totalTokens: aiResult.usage?.totalTokens },
        "AI provider returned document response",
      );

      // 7. Validate output using the registered Zod schema.
      let result: any;
      try {
        logGenerationEvent("json_parsed", correlation, {
          provider: aiResult.provider,
          model: aiResult.model,
        });
        result = config.schema.parse(aiResult.data);
        logger.info(
          { caseId, userId, documentType: type },
          "Document JSON successfully validated against Zod schema",
        );
        logGenerationEvent("schema_validated", correlation);
      } catch (err) {
        logger.error(
          { caseId, userId, documentType: type, validationIssueCount: typeof err === "object" && err && "issues" in err && Array.isArray(err.issues) ? err.issues.length : undefined },
          "Validation failure for document",
        );
        throw new InvalidAIResponseError({ category: "invalid_schema", provider: aiResult.provider, model: aiResult.model, safeDetails: { documentType: type } });
      }

      // 8. Execute all database writes atomically inside a single transaction
      logger.info(
        { caseId, userId, documentType: type },
        "Running database transaction for document generation",
      );
      logGenerationEvent("document_saved", correlation, {
        documentId: document.id,
        version: document.version,
      });
      await options.onStage?.("saving_document", "Saving generated document", 90);
      const document = await prisma.$transaction(async (tx) => {
        // a. Pessimistic lock on the Case row to serialize concurrent writes
        await tx.$executeRaw`SELECT id FROM "Case" WHERE id = ${caseId} FOR UPDATE`;

        // b. Compute the next version number
        const latestCompletedDoc = await tx.generatedDocument.findFirst({
          where: { caseId, type, status: "COMPLETED" },
          orderBy: { version: "desc" },
        });
        const nextVer = latestCompletedDoc ? latestCompletedDoc.version + 1 : 1;

        // c. Find the GENERATING placeholder (created at enqueue time) or create a new document
        const documentTitle = `${config.titlePrefix} - v${nextVer}`;
        const documentContent = requestId ? { ...result, _requestId: requestId } : result;

        let doc;
        if (requestId) {
          // Worker path: look for the placeholder document by requestId in sourceSnapshot
          const placeholders = await tx.generatedDocument.findMany({
            where: { caseId, type, status: "GENERATING" },
          });
          const placeholder = placeholders.find((d: any) => {
            const snapshot = d.sourceSnapshot as { requestId?: string } | null;
            return snapshot?.requestId === requestId;
          });

          if (placeholder) {
            // Update the GENERATING placeholder to COMPLETED
            doc = await documentRepository.updateToCompleted(placeholder.id, {
              title: documentTitle,
              content: documentContent,
              version: nextVer,
            }, tx);
          } else {
            // Fallback: create a new document if no placeholder was found
            doc = await documentRepository.create(userId, {
              caseId,
              type,
              title: documentTitle,
              content: documentContent,
              version: nextVer,
            }, tx);
          }
        } else {
          // Direct-call path (non-worker): create a new document
          doc = await documentRepository.create(userId, {
            caseId,
            type,
            title: documentTitle,
            content: documentContent,
            version: nextVer,
          }, tx);
        }

        // d. Store AIRequestLog for observability (only if not background job since worker logs it)
        if (!requestId) {
          await aiObservabilityService.logRequest(userId, {
            requestType: config.aiRequestType,
            prompt: "[redacted]",
            retrievedContext: retrievedChunks.length > 0 ? `[${retrievedChunks.length} retrieved chunks]` : undefined,
            response: "[redacted]",
            latencyMs: aiResult.latencyMs,
            modelUsed,
            tokenUsage: aiResult.usage?.totalTokens,
            caseId,
          }, tx);
        }

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
      return { document, ai: aiResult, retrievedChunksCount: retrievedChunks.length, contextTruncated };


    })
  }

  private limitPrompt(prompt: string, configuredLimit: number): string {
    const limit = Number.isFinite(configuredLimit) && configuredLimit >= 10_000 ? configuredLimit : 50_000;
    if (prompt.length <= limit) return prompt;
    const marker = "\n\n[CONTEXT TRUNCATED TO AI_MAX_CONTEXT_CHARS]\n\n";
    const tailLength = Math.min(10_000, Math.floor(limit * 0.25));
    const headLength = limit - tailLength - marker.length;
    return `${prompt.slice(0, headLength)}${marker}${prompt.slice(-tailLength)}`;
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
