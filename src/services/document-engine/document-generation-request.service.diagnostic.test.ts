import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentType } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findLatestByType: vi.fn(),
  createGenerating: vi.fn(),
  addDocumentJob: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/repositories/case.repository", () => ({
  CaseRepository: class { findById = mocks.findById; },
}));
vi.mock("@/repositories/document.repository", () => ({
  documentRepository: {
    findLatestByType: mocks.findLatestByType,
    createGenerating: mocks.createGenerating,
  },
}));
vi.mock("@/services/queue/queue-producer.service", () => ({
  queueProducerService: { addDocumentGenerationJob: mocks.addDocumentJob },
}));
vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }));

const validCase = {
  id: "case_diagnostic_request_001",
  narrative: "A complainant reported a mobile phone theft at Market Road.",
  victims: [{ id: "victim_001" }],
  accused: [],
  persons: [{ role: "VICTIM" }],
  caseMetadata: null,
};

describe("DocumentGenerationRequestService diagnostic contracts", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.findById.mockResolvedValue(validCase);
    mocks.findLatestByType.mockResolvedValue(null);
    mocks.createGenerating.mockResolvedValue({ id: "placeholder_001" });
    mocks.addDocumentJob.mockResolvedValue({
      jobId: "document-generation__case_diagnostic_request_001__FIR",
      requestId: "docgen_diagnostic_001",
      queueName: "document-generation",
      reused: false,
      state: "waiting",
    });
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });
  });

  it("demonstrates that a worker can complete before the placeholder is written", async () => {
    const events: string[] = [];
    mocks.addDocumentJob.mockImplementation(async () => {
      events.push("job_enqueued");
      // Controlled schedule: BullMQ is free to start a worker immediately
      // after Queue.add resolves, before the request service writes the marker.
      events.push("worker_completed_document");
      return {
        jobId: "document-generation__case_diagnostic_request_001__FIR",
        requestId: "docgen_diagnostic_001",
        queueName: "document-generation",
        reused: false,
        state: "waiting",
      };
    });
    mocks.createGenerating.mockImplementation(async () => {
      events.push("placeholder_written");
      return { id: "placeholder_001" };
    });

    const { DocumentGenerationRequestService } = await import("./document-generation-request.service");
    await new DocumentGenerationRequestService().requestDocumentGeneration({
      caseId: validCase.id,
      userId: "user_diagnostic_001",
      documentType: DocumentType.FIR,
    });

    expect(events).toEqual([
      "job_enqueued",
      "worker_completed_document",
      "placeholder_written",
    ]);
  });

  it("returns an unpollable job contract for a stale GENERATING record without snapshot IDs", async () => {
    mocks.findLatestByType.mockResolvedValue({
      id: "placeholder_stale_001",
      status: "GENERATING",
      sourceSnapshot: {},
    });
    const { DocumentGenerationRequestService } = await import("./document-generation-request.service");

    const result = await new DocumentGenerationRequestService().requestDocumentGeneration({
      caseId: validCase.id,
      userId: "user_diagnostic_001",
      documentType: DocumentType.FIR,
    });

    expect(result).toMatchObject({
      existingDocumentFound: false,
      state: "active",
      jobId: null,
      queueName: null,
    });
    expect(mocks.addDocumentJob).not.toHaveBeenCalled();
  });
});
