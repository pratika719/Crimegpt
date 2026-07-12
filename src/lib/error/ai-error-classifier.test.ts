import { describe, expect, it } from "vitest";
import { classifyAIError } from "@/lib/error/ai-error-classifier";

describe("classifyAIError", () => {
  it("treats Gemini quota exhaustion as non-retryable", () => {
    const result = classifyAIError(
      new Error(
        "429 Too Many Requests: Quota exceeded: GenerateRequestsPerDayPerProjectPerModel-FreeTier",
      ),
    );

    expect(result.category).toBe("quota_error");
    expect(result.retryable).toBe(false);
    expect(result.userMessage).toBe(
      "AI quota limit reached for today. Please try again later.",
    );
  });

  it("treats FastAPI cold-start gateway failures as retryable", () => {
    const result = classifyAIError(
      new Error("FastAPI embedding request failed: 502 Bad Gateway"),
    );

    expect(result.category).toBe("embedding_service_unavailable");
    expect(result.retryable).toBe(true);
  });

  it("treats provider auth failures as non-retryable", () => {
    const result = classifyAIError(new Error("403 permission denied"));

    expect(result.category).toBe("provider_auth_error");
    expect(result.retryable).toBe(false);
  });
});
