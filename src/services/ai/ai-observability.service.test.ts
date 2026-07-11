import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiObservabilityService } from "@/services/ai/ai-observability.service";
import { aiRequestLogRepository } from "@/repositories/ai-request-log.repository";
import type { CreateAIRequestLogInput } from "@/repositories/ai-request-log.repository";

vi.mock("@/repositories/ai-request-log.repository", () => ({
  aiRequestLogRepository: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("AIObservabilityService", () => {
  beforeEach(() => {
    vi.mocked(aiRequestLogRepository.create).mockReset();
  });

  describe("logSuccess", () => {
    it("calls repository.create with SUCCESS status", async () => {
      vi.mocked(aiRequestLogRepository.create).mockResolvedValue({} as never);

      await aiObservabilityService.logSuccess({
        caseId: "case_1",
        userId: "user_1",
        jobId: "job_1",
        requestType: "FIR",
        modelUsed: "gemini-2.5-flash",
        latencyMs: 1200,
      });

      expect(aiRequestLogRepository.create).toHaveBeenCalledOnce();
      expect(aiRequestLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: "case_1",
          userId: "user_1",
          jobId: "job_1",
          requestType: "FIR",
          status: "SUCCESS",
          latencyMs: 1200,
        }),
      );
    });

    it("does not throw when repository.create throws", async () => {
      vi.mocked(aiRequestLogRepository.create).mockRejectedValue(
        new Error("DB unavailable"),
      );

      await expect(
        aiObservabilityService.logSuccess({
          userId: "user_1",
          requestType: "FIR",
          latencyMs: 100,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("logFailure", () => {
    it("calls repository.create with FAILED status", async () => {
      vi.mocked(aiRequestLogRepository.create).mockResolvedValue({} as never);

      await aiObservabilityService.logFailure({
        caseId: "case_1",
        userId: "user_1",
        jobId: "job_1",
        requestType: "FIR",
        latencyMs: 800,
        failureReason: "Gemini returned invalid JSON",
      });

      expect(aiRequestLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "FAILED",
          failureReason: "Gemini returned invalid JSON",
        }),
      );
    });

    it("truncates failure reason longer than 1000 characters", async () => {
      vi.mocked(aiRequestLogRepository.create).mockResolvedValue({} as never);

      const longReason = "x".repeat(1500);

      await aiObservabilityService.logFailure({
        userId: "user_1",
        requestType: "FIR",
        latencyMs: 0,
        failureReason: longReason,
      });

      const call = vi.mocked(aiRequestLogRepository.create).mock
        .calls[0]?.[0] as unknown as CreateAIRequestLogInput;
      // truncateFailureReason slices to 1000 and appends "..." → max 1003
      expect(call.failureReason?.length).toBeLessThanOrEqual(1003);
      expect(call.failureReason).toMatch(/\.\.\.$/);
    });

    it("keeps failure reason unchanged when under 1000 characters", async () => {
      vi.mocked(aiRequestLogRepository.create).mockResolvedValue({} as never);

      const shortReason = "Short error";

      await aiObservabilityService.logFailure({
        userId: "user_1",
        requestType: "FIR",
        latencyMs: 0,
        failureReason: shortReason,
      });

      const call = vi.mocked(aiRequestLogRepository.create).mock
        .calls[0]?.[0] as unknown as CreateAIRequestLogInput;
      expect(call.failureReason).toBe(shortReason);
    });

    it("does not throw when repository.create throws", async () => {
      vi.mocked(aiRequestLogRepository.create).mockRejectedValue(
        new Error("DB unavailable"),
      );

      await expect(
        aiObservabilityService.logFailure({
          userId: "user_1",
          requestType: "FIR",
          latencyMs: 100,
          failureReason: "some error",
        }),
      ).resolves.not.toThrow();
    });
  });
});
