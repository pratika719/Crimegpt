import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentRegistry, DocumentType } from '../document-registry';
import { AIRequestType, ActivityType } from '@prisma/client';
import type { GeneratedDocumentSummary } from '../document.types';

export interface SaveDocumentParams {
  caseId: string;
  userId: string;
  type: DocumentType;
  content: unknown;
  rawResponse: string;
  retrievedChunks: unknown[];
  latencyMs: number;
  modelUsed: string;
  tokenUsage?: number;
  requestId?: string;
}

@Injectable()
export class DocumentPersistenceService {
  private readonly logger = new Logger(DocumentPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a newly generated document, audit logs, and case activity in an atomic transaction.
   */
  async saveGeneratedDocument(params: SaveDocumentParams): Promise<GeneratedDocumentSummary> {
    const {
      caseId,
      userId,
      type,
      content,
      rawResponse,
      retrievedChunks,
      latencyMs,
      modelUsed,
      tokenUsage,
      requestId,
    } = params;

    return this.prisma.$transaction(
      async (tx) => {
        // Pessimistic lock on the Case row to serialize concurrent document writes for the case
        await tx.$executeRaw`SELECT id FROM "Case" WHERE id = ${caseId} FOR UPDATE`;

        // Compute next version
        const existingDocs = await tx.generatedDocument.findMany({
          where: { caseId, type },
        });

        let nextVer = 1;
        if (requestId) {
          const existingDoc = existingDocs.find((d) => {
            const c = d.content as Record<string, unknown>;
            return c?._requestId === requestId;
          });
          if (existingDoc) {
            nextVer = existingDoc.version;
            await tx.generatedDocument.delete({ where: { id: existingDoc.id } });
          } else {
            nextVer = existingDocs.length > 0
              ? Math.max(...existingDocs.map((d) => d.version)) + 1
              : 1;
          }
        } else {
          nextVer = existingDocs.length > 0
            ? Math.max(...existingDocs.map((d) => d.version)) + 1
            : 1;
        }

        const config = DocumentRegistry.getConfig(type);
        const title = `${config.titlePrefix} - v${nextVer}`;
        const contentWithMeta = requestId
          ? { ...(content as object), _requestId: requestId }
          : content;

        // Save the generated document
        const doc = await tx.generatedDocument.create({
          data: {
            caseId,
            type,
            title,
            content: contentWithMeta as any,
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
            retrievedContext:
              retrievedChunks.length > 0 ? JSON.stringify(retrievedChunks) : undefined,
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

        return {
          id: doc.id,
          type: doc.type,
          title: doc.title,
          content: doc.content,
          version: doc.version,
          createdAt: doc.createdAt,
        };
      },
      { maxWait: 20_000, timeout: 40_000 },
    );
  }

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
}
