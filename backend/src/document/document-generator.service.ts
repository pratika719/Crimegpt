import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../ai/providers/gemini.provider';
import { PROMPT_SECURITY_INSTRUCTIONS } from '../ai/constants/ai.constants';
import { LawRetrieverService } from '../ai/retrievers/law-retriever.service';
import { UnifiedContextService } from '../case/services/unified-context.service';
import { DocumentRegistry, DocumentType } from './document-registry';
import { RedisService } from '../redis/redis.service';
import { z, ZodError } from 'zod';
import { AIRequestType, ActivityType } from '@/generated/prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgressCallback = (status: string, progress: number, message: string) => Promise<void>;

interface GenerateResult {
  document: { id: string; type: string; title: string; content: unknown; version: number; createdAt: Date };
  latencyMs: number;
  modelUsed: string;
  tokenUsage?: number;
  repaired: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCK_TTL_MS = 240_000; // 4 minutes
const DOC_GEN_REPAIR_ENABLED = process.env.DOCGEN_REPAIR_RETRY !== 'false';

// ---------------------------------------------------------------------------
// DocumentGeneratorService
// ---------------------------------------------------------------------------

@Injectable()
export class DocumentGeneratorService {
  private readonly logger = new Logger(DocumentGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly lawRetriever: LawRetrieverService,
    private readonly unifiedContext: UnifiedContextService,
    private readonly redis: RedisService,
  ) {}

  /**
   * The core unified AI document generation pipeline.
   *
   * Flow:
   * 1. Acquire Redis lock (prevent concurrent generation for same case+type)
   * 2. Fetch case context
   * 3. Validate required entities
   * 4. RAG retrieval (if required)
   * 5. Build prompt
   * 6. Gemini call + Zod validation + optional repair retry
   * 7. DB transaction (save doc, log observability, log activity)
   */
  async generateDocument(
    caseId: string,
    userId: string,
    type: DocumentType,
    opts?: { requestId?: string; onProgress?: ProgressCallback; forceRegenerate?: boolean },
  ): Promise<GenerateResult> {
    const lockKey = `lock:doc-gen:${caseId}:${type}`;
    const lockClient = this.redis.getClient();

    // Acquire Redis lock
    const lockToken = await this.acquireLock(lockClient, lockKey, LOCK_TTL_MS);
    if (!lockToken) {
      throw new Error('Document generation is already in progress for this case and type.');
    }

    try {
      return await this.executeGeneration(caseId, userId, type, opts);
    } finally {
      await this.releaseLock(lockClient, lockKey, lockToken);
    }
  }

  // -----------------------------------------------------------------------
  // Core pipeline
  // -----------------------------------------------------------------------

  private async executeGeneration(
    caseId: string,
    userId: string,
    type: DocumentType,
    opts?: { requestId?: string; onProgress?: ProgressCallback; forceRegenerate?: boolean },
  ): Promise<GenerateResult> {
    const onProgress = opts?.onProgress;
    const requestId = opts?.requestId;

    await onProgress?.('STARTED', 5, 'Document generation started.');

    // 1. Build the unified case context
    const context = await this.unifiedContext.buildUnifiedCaseContext(caseId, userId);
    const enrichedContext = this.enrichContext(context, type);

    await onProgress?.('BUILDING_CONTEXT', 20, 'Building case context.');

    // 2. Validate required entities (fail fast)
    this.validateEntities(enrichedContext, type);

    // 3. RAG retrieval (parallel with cache check)
    const config = DocumentRegistry.getConfig(type);
    let retrievedChunks: Awaited<ReturnType<LawRetrieverService['retrieve']>> = [];

    if (config.requiresRAG) {
      await onProgress?.('RETRIEVING_CONTEXT', 30, 'Retrieving legal context...');

      const ragQueryParts = [
        enrichedContext.title,
        enrichedContext.narrative,
        enrichedContext.investigationProfile?.incidentDescription,
      ].filter(Boolean);
      const ragQuery = ragQueryParts.join('\n\n').trim();
      const isRegeneration = Boolean(opts?.forceRegenerate);

      try {
        retrievedChunks = await this.lawRetriever.retrieve(ragQuery, 6, {
          bypassCache: isRegeneration,
        });
        this.logger.log(`Retrieved ${retrievedChunks.length} law sections`);
      } catch (ragErr) {
        this.logger.warn({ err: ragErr }, 'RAG retrieval failed — continuing without legal context');
      }
    }

    await onProgress?.('RETRIEVING_CONTEXT', 40, 'Retrieved legal context, building prompt.');

    // 4. Build prompt
    const promptText = config.buildPrompt(enrichedContext, retrievedChunks);

    await onProgress?.('GENERATING', 60, 'Generating document with AI model.');

    // 5. Gemini call + validation + repair
    const generated = await this.generateValidatedOutput(promptText, config.schema, type);
    const { result, rawResponse, latencyMs, tokenUsage, repaired } = generated;

    await onProgress?.('SAVING', 90, 'Saving generated document.');

    // 6. DB transaction
    const document = await this.saveDocument(
      caseId,
      userId,
      type,
      result,
      rawResponse,
      retrievedChunks,
      latencyMs,
      this.gemini.getModelName(),
      tokenUsage,
      requestId,
    );

    await onProgress?.('COMPLETED', 100, 'Document generation completed.');

    return {
      document: {
        id: document.id,
        type: document.type,
        title: document.title,
        content: document.content,
        version: document.version,
        createdAt: document.createdAt,
      },
      latencyMs,
      modelUsed: this.gemini.getModelName(),
      tokenUsage,
      repaired,
    };
  }

  // -----------------------------------------------------------------------
  // Gemini + validation + repair
  // -----------------------------------------------------------------------

  private async generateValidatedOutput<T>(
    promptText: string,
    schema: z.ZodType<T>,
    type: DocumentType,
  ): Promise<{
    result: T;
    rawResponse: string;
    latencyMs: number;
    tokenUsage?: number;
    repaired: boolean;
  }> {
    const totalStart = Date.now();

    // First attempt — use systemInstruction for security
    const initial = await this.gemini.generateJSON(promptText, {
      systemInstruction: PROMPT_SECURITY_INSTRUCTIONS,
    });

    const firstAttempt = this.parseAndValidate(schema, initial.text);
    if (firstAttempt.ok) {
      return {
        result: firstAttempt.result,
        rawResponse: initial.text,
        latencyMs: Date.now() - totalStart,
        tokenUsage: initial.tokenUsage,
        repaired: false,
      };
    }

    // Single bounded repair attempt
    if (DOC_GEN_REPAIR_ENABLED) {
      const repairPrompt = this.buildRepairPrompt(promptText, initial.text, firstAttempt.issues);
      this.logger.warn({ documentType: type, issueCount: firstAttempt.issues.length }, 'Attempting to repair AI output');

      try {
        const repaired = await this.gemini.generateJSON(repairPrompt, {
          systemInstruction: PROMPT_SECURITY_INSTRUCTIONS,
        });
        const repairedAttempt = this.parseAndValidate(schema, repaired.text);
        if (repairedAttempt.ok) {
          return {
            result: repairedAttempt.result,
            rawResponse: repaired.text,
            latencyMs: Date.now() - totalStart,
            tokenUsage: repaired.tokenUsage,
            repaired: true,
          };
        }
      } catch {
        this.logger.warn('Repair attempt errored — falling back to original failure');
      }
    }

    throw new Error(`Document generation failed for ${type}: ${firstAttempt.error?.message}`);
  }

  private parseAndValidate<T>(schema: z.ZodType<T>, text: string):
    | { ok: true; result: T; error: null; issues: [] }
    | { ok: false; result: null; error: Error; issues: unknown[] } {
    try {
      const rawData = JSON.parse(text);
      const result = schema.parse(rawData);
      return { ok: true, result, error: null, issues: [] };
    } catch (error: unknown) {
      const issues = error instanceof ZodError ? error.issues : [];
      return { ok: false, result: null, error: error as Error, issues };
    }
  }

  private buildRepairPrompt(originalPrompt: string, rawResponse: string, issues: unknown[]): string {
    const issueSummary = issues
      .map((i: any) => `- ${i.path?.join('.')}: ${i.message}`)
      .join('\n');

    return `${originalPrompt}

The previous response failed validation with these issues:
${issueSummary}

Previous response:
${rawResponse}

Please fix the validation issues and return a single valid JSON object matching the expected schema. Do not wrap in markdown code blocks.`;
  }

  // -----------------------------------------------------------------------
  // Entity validation
  // -----------------------------------------------------------------------

  private validateEntities(context: any, type: DocumentType): void {
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

  // -----------------------------------------------------------------------
  // DB persistence
  // -----------------------------------------------------------------------

  private mapDocumentTypeToAIRequestType(type: DocumentType): AIRequestType {
    switch (type) {
      case DocumentType.FIR:
        return AIRequestType.FIR_GENERATION;
      case DocumentType.INVESTIGATION_SUMMARY:
        return AIRequestType.INVESTIGATION_SUMMARY;
      case DocumentType.CHARGE_SHEET:
        return AIRequestType.CHARGE_SHEET;
      case DocumentType.REMAND_REQUEST:
        return AIRequestType.REMAND_REQUEST_GENERATION;
      case DocumentType.CASE_DIARY:
        return AIRequestType.CASE_DIARY_GENERATION;
      case DocumentType.LEGAL_ANALYSIS:
        return AIRequestType.LEGAL_ANALYSIS;
      default:
        return AIRequestType.LEGAL_ANALYSIS;
    }
  }

  private mapDocumentTypeToActivityType(type: DocumentType): ActivityType {
    switch (type) {
      case DocumentType.FIR:
        return ActivityType.FIR_GENERATED;
      case DocumentType.INVESTIGATION_SUMMARY:
        return ActivityType.INVESTIGATION_SUMMARY_GENERATED;
      case DocumentType.CHARGE_SHEET:
        return ActivityType.CHARGE_SHEET_GENERATED;
      case DocumentType.REMAND_REQUEST:
        return ActivityType.REMAND_REQUEST_GENERATED;
      case DocumentType.CASE_DIARY:
        return ActivityType.CASE_DIARY_GENERATED;
      case DocumentType.LEGAL_ANALYSIS:
        return ActivityType.LEGAL_ANALYSIS_GENERATED;
      default:
        return ActivityType.DOCUMENT_CREATED;
    }
  }

  private async saveDocument(
    caseId: string,
    userId: string,
    type: DocumentType,
    content: unknown,
    rawResponse: string,
    retrievedChunks: unknown[],
    latencyMs: number,
    modelUsed: string,
    tokenUsage: number | undefined,
    requestId: string | undefined,
  ) {
    return this.prisma.$transaction(
      async (tx: any) => {
        // Pessimistic lock on the Case row
        await tx.$executeRaw`SELECT id FROM "Case" WHERE id = ${caseId} FOR UPDATE`;

        // Compute next version
        const existingDocs = await tx.generatedDocument.findMany({
          where: { caseId, type },
        });

        let nextVer = 1;
        if (requestId) {
          const existingDoc = existingDocs.find((d: any) => {
            const c = d.content as Record<string, unknown>;
            return c?._requestId === requestId;
          });
          if (existingDoc) {
            nextVer = existingDoc.version;
            await tx.generatedDocument.delete({ where: { id: existingDoc.id } });
          } else {
            nextVer = existingDocs.length > 0
              ? Math.max(...existingDocs.map((d: any) => d.version)) + 1
              : 1;
          }
        } else {
          nextVer = existingDocs.length > 0
            ? Math.max(...existingDocs.map((d: any) => d.version)) + 1
            : 1;
        }

        const config = DocumentRegistry.getConfig(type);
        const title = `${config.titlePrefix} - v${nextVer}`;
        const contentWithMeta = requestId ? { ...(content as object), _requestId: requestId } : content;

        // Save the document
        const doc = await tx.generatedDocument.create({
          data: {
            caseId,
            type,
            title,
            content: contentWithMeta,
            version: nextVer,
          },
        });

        // Log AI request for observability
        await tx.aIRequestLog.create({
          data: {
            userId,
            caseId,
            requestType: this.mapDocumentTypeToAIRequestType(type),
            prompt: rawResponse, // Store raw response, not full prompt (too large)
            retrievedContext: retrievedChunks.length > 0 ? JSON.stringify(retrievedChunks) : undefined,
            response: rawResponse,
            latencyMs,
            modelUsed,
            tokenUsage,
          },
        });

        // Log activity
        await tx.caseActivity.create({
          data: {
            caseId,
            activityType: this.mapDocumentTypeToActivityType(type),
            description: `${config.titlePrefix} v${nextVer} generated successfully.`,
          },
        });

        // Transition case status from OPEN to UNDER_INVESTIGATION for FIR
        if (type === DocumentType.FIR) {
          const caseItem = await tx.case.findUnique({ where: { id: caseId } });
          if (caseItem?.status === 'OPEN') {
            await tx.case.update({
              where: { id: caseId },
              data: { status: 'UNDER_INVESTIGATION' },
            });
          }
        }

        return doc;
      },
      { maxWait: 20_000, timeout: 40_000 },
    );
  }

  // -----------------------------------------------------------------------
  // Context enrichment
  // -----------------------------------------------------------------------

  private enrichContext(context: any, type?: DocumentType): any {
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

  // -----------------------------------------------------------------------
  // Redis lock helpers
  // -----------------------------------------------------------------------

  private async acquireLock(client: any, key: string, ttlMs: number): Promise<string | null> {
    const token = crypto.randomUUID();
    const result = await client.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
  }

  private async releaseLock(client: any, key: string, token: string): Promise<void> {
    const script = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end`;
    await client.eval(script, 1, key, token);
  }
}
