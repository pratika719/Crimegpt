import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentType } from "@/generated/prisma/client";
import {
  validFIRCaseId,
  validFIRContext,
  validFIROutput,
  validFIRRequestId,
  validFIRUserId,
} from "@/test/fixtures/fir-generation.fixture";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  buildContext: vi.fn(),
  retrieve: vi.fn(),
  generateJSON: vi.fn(),
  updateToCompleted: vi.fn(),
  logActivity: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/repositories/case.repository", () => ({
  CaseRepository: class {
    findById = mocks.findById;
    updateStatus = vi.fn();
  },
}));
vi.mock("@/services/case/unified-context.service", () => ({
  unifiedContextService: { buildUnifiedCaseContext: mocks.buildContext },
}));
vi.mock("@/ai/retrievers/law.retriever", () => ({ lawRetriever: { retrieve: mocks.retrieve } }));
vi.mock("@/ai/providers/provider-factory", () => ({
  getResilientAIProvider: () => ({ name: "groq", model: "llama-test", generateJSON: mocks.generateJSON }),
}));
vi.mock("@/lib/redis/redis-lock", () => ({ withRedisLock: async (_key: string, _ttl: number, fn: () => unknown) => fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/repositories/document.repository", () => ({
  documentRepository: { updateToCompleted: mocks.updateToCompleted, create: vi.fn() },
}));
vi.mock("@/services/activity/activity.service", () => ({
  activityService: { logDocumentGenerated: mocks.logActivity },
}));
vi.mock("@/services/ai/ai-observability.service", () => ({ aiObservabilityService: { logRequest: vi.fn() } }));

describe("DocumentGeneratorService diagnostic minimal FIR path", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.findById.mockResolvedValue({ id: validFIRCaseId, status: "OPEN" });
    mocks.buildContext.mockResolvedValue(validFIRContext);
    mocks.retrieve.mockResolvedValue([]);
    mocks.generateJSON.mockResolvedValue({
      data: validFIROutput,
      provider: "groq",
      model: "llama-test",
      latencyMs: 12,
      usage: { totalTokens: 42 },
      fallbackUsed: false,
    });
    mocks.updateToCompleted.mockResolvedValue({ id: "document_diagnostic_001", version: 1 });
    mocks.logActivity.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({
      $executeRaw: vi.fn(),
      generatedDocument: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([{ id: "placeholder_001", sourceSnapshot: { requestId: validFIRRequestId } }]),
      },
    }));
  });

  it("persists a schema-valid FIR with mocked retrieval and provider", async () => {
    const { DocumentGeneratorService } = await import("./document-generator.service");
    const service = new DocumentGeneratorService();

    const result = await service.generateDocument(
      validFIRCaseId,
      validFIRUserId,
      DocumentType.FIR,
      validFIRRequestId,
    );

    expect(mocks.retrieve).toHaveBeenCalledWith(validFIRContext.narrative, 4);
    expect(mocks.generateJSON).toHaveBeenCalledOnce();
    expect(mocks.updateToCompleted).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      document: { id: "document_diagnostic_001" },
      ai: { provider: "groq", model: "llama-test" },
    });
  });
});
