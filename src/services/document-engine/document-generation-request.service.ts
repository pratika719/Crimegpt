import { DocumentType } from "@/generated/prisma/client";
import { CaseRepository } from "@/repositories/case.repository";
import { documentRepository } from "@/repositories/document.repository";
import { queueProducerService } from "@/services/queue/queue-producer.service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { AppError } from "@/lib/error/app-error";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";
import { logGenerationEvent } from "@/lib/ai/generation-diagnostics";

type EnqueueDocumentGenerationInput = {
  caseId: string;
  userId: string;
  documentType: DocumentType;
  forceRegenerate?: boolean;
  generationId?: string;
};

function getDailyLimit(envName: string, fallback: number): number {
  const configured = Number(process.env[envName]);
  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function secondsUntilTomorrow() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.max(Math.ceil((tomorrow.getTime() - now.getTime()) / 1000), 60);
}

export class DocumentGenerationRequestService {
  private readonly caseRepository = new CaseRepository();

  private assertDocumentPreconditions(
    caseItem: Awaited<ReturnType<CaseRepository["findById"]>>,
    documentType: DocumentType,
  ) {
    if (!caseItem) {
      throw new AppError("Case not found or access denied.", "NOT_FOUND", {
        category: "validation_error",
        retryable: false,
      });
    }

    if (documentType === DocumentType.FIR) {
      const hasVictim =
        caseItem.victims.length > 0 ||
        caseItem.persons.some((person) => person.role === "VICTIM") ||
        Boolean(caseItem.caseMetadata?.victimName?.trim());

      if (!hasVictim) {
        throw new AppError(
          "Add at least one victim/complainant before generating an FIR.",
          "VALIDATION_ERROR",
          {
            category: "validation_error",
            retryable: false,
          },
        );
      }
    }

    if (documentType === DocumentType.CHARGE_SHEET) {
      const hasAccused =
        caseItem.accused.length > 0 ||
        caseItem.persons.some((person) => person.role === "SUSPECT") ||
        Boolean(caseItem.caseMetadata?.suspectName?.trim());

      if (!hasAccused) {
        throw new AppError(
          "Add at least one accused/suspect before generating a chargesheet.",
          "VALIDATION_ERROR",
          {
            category: "validation_error",
            retryable: false,
          },
        );
      }
    }

    if (!caseItem.narrative?.trim()) {
      throw new AppError(
        "Add a case narrative before generating this document.",
        "VALIDATION_ERROR",
        {
          category: "validation_error",
          retryable: false,
        },
      );
    }
  }

  private async checkDailyLimit(input: {
    userId: string;
    forceRegenerate: boolean;
  }) {
    const isRegenerate = input.forceRegenerate;
    const keyPrefix = isRegenerate
      ? "rate-limit:ai-doc-regenerate"
      : "rate-limit:ai-doc-generation";
    const limit = isRegenerate
      ? getDailyLimit("AI_REGENERATE_DAILY_LIMIT", 2)
      : getDailyLimit("AI_DOCUMENT_DAILY_LIMIT", 5);

    const rateLimit = await checkRateLimit({
      key: `${keyPrefix}:${input.userId}:${getTodayKey()}`,
      limit,
      windowSeconds: secondsUntilTomorrow(),
    });

    if (!rateLimit.allowed) {
      throw new AppError(
        "Daily AI generation limit reached. Please try again tomorrow.",
        "RATE_LIMIT_EXCEEDED",
        {
          category: "quota_error",
          retryable: false,
        },
      );
    }
  }

  async requestDocumentGeneration(input: EnqueueDocumentGenerationInput) {
    const forceRegenerate = input.forceRegenerate ?? false;
    const generationId = input.generationId ?? `docgen_${crypto.randomUUID()}`;
    const correlation = {
      generationId,
      caseId: input.caseId,
      documentType: input.documentType,
    };
    logGenerationEvent("generation_started", correlation);
    const caseItem = await this.caseRepository.findById(input.caseId, input.userId);

    this.assertDocumentPreconditions(caseItem, input.documentType);
    logGenerationEvent("validation_passed", correlation);

    if (!forceRegenerate) {
      const existingDocument = await documentRepository.findLatestByType(
        input.caseId,
        input.userId,
        input.documentType,
      );

      if (existingDocument && existingDocument.status !== "FAILED") {
        // If there's already a GENERATING document, return its job info so the UI can resume polling
        if (existingDocument.status === "GENERATING") {
          const snapshot = existingDocument.sourceSnapshot as { jobId?: string; queueName?: string } | null;
          logger.info(
            {
              caseId: input.caseId,
              userId: input.userId,
              documentType: input.documentType,
              documentId: existingDocument.id,
              status: "GENERATING",
            },
            "Found in-progress document generation — returning existing job info",
          );

          return {
            existingDocumentFound: false,
            documentType: input.documentType,
            message: "Document generation is already in progress.",
            jobId: snapshot?.jobId ?? null,
            queueName: snapshot?.queueName ?? null,
            requestId: null,
            reused: true,
            state: "active",
          };
        }

        logger.info(
          {
            caseId: input.caseId,
            userId: input.userId,
            documentType: input.documentType,
            documentId: existingDocument.id,
            existingDocumentFound: true,
          },
          "Reusing existing generated document instead of enqueueing AI job",
        );

        return {
          existingDocumentFound: true,
          documentId: existingDocument.id,
          documentType: input.documentType,
          message: "This document has already been generated.",
        };
      }
    }

    await this.checkDailyLimit({
      userId: input.userId,
      forceRegenerate,
    });

    const queued = await queueProducerService.addDocumentGenerationJob({
      caseId: input.caseId,
      userId: input.userId,
      documentType: input.documentType,
      forceRegenerate,
      requestId: generationId,
    });
    logGenerationEvent("job_enqueued", {
      ...correlation,
      jobId: queued.jobId,
    }, { queueName: queued.queueName, reused: queued.reused });

    // Create a GENERATING placeholder document in PostgreSQL so the UI can track the job
    // even after page refresh. The worker will update this record on completion or failure.
    try {
      await documentRepository.createGenerating(input.userId, {
        caseId: input.caseId,
        type: input.documentType,
        title: `Generating ${input.documentType.replace(/_/g, " ")}...`,
        sourceSnapshot: {
          jobId: queued.jobId,
          queueName: queued.queueName,
          requestId: queued.requestId,
          enqueuedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      // Non-fatal: if the placeholder fails, the generation itself still proceeds
      logger.warn(
        { err, caseId: input.caseId, documentType: input.documentType },
        "Failed to create GENERATING placeholder document — generation will still proceed",
      );
    }

    return {
      existingDocumentFound: false,
      documentType: input.documentType,
      message: forceRegenerate
        ? "Document regeneration started."
        : "Document generation started.",
      ...queued,
    };
  }
}

export const documentGenerationRequestService =
  new DocumentGenerationRequestService();
