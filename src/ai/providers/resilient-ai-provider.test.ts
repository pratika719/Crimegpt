import { describe, expect, it, vi } from "vitest";
import type { AIProviderResult, AITextProvider } from "./ai-provider";
import { ResilientAIProvider } from "./resilient-ai-provider";
import { AIProviderError } from "@/lib/error/ai-provider-error";

function provider(name: "groq" | "gemini", implementation: () => Promise<AIProviderResult<unknown>>): AITextProvider {
  return {
    name,
    model: `${name}-model`,
    generateText: vi.fn(implementation) as AITextProvider["generateText"],
    generateJSON: vi.fn(implementation) as AITextProvider["generateJSON"],
  };
}

const unavailable = () => Promise.reject(new AIProviderError({
  category: "provider_unavailable",
  provider: "groq",
  model: "groq-model",
  retryable: true,
  userMessage: "AI provider is temporarily unavailable.",
}));

describe("ResilientAIProvider", () => {
  it("bounds calls to two primary attempts and one fallback", async () => {
    const primary = provider("groq", unavailable);
    const fallback = provider("gemini", async () => ({ data: { ok: true }, provider: "gemini", model: "gemini-model", latencyMs: 5, fallbackUsed: false }));
    const resilient = new ResilientAIProvider(primary, fallback, { retryDelayMs: () => 0 });

    const result = await resilient.generateJSON<{ ok: boolean }>({ userPrompt: "prompt" });

    expect(result.fallbackUsed).toBe(true);
    expect(result.provider).toBe("gemini");
    expect(primary.generateJSON).toHaveBeenCalledTimes(2);
    expect(fallback.generateJSON).toHaveBeenCalledTimes(1);
  });

  it("does not fallback for schema validation failures", async () => {
    const primary = provider("groq", () => Promise.reject(new AIProviderError({ category: "invalid_schema", provider: "groq", retryable: true, userMessage: "invalid schema" })));
    const fallback = provider("gemini", async () => ({ data: {}, provider: "gemini", model: "gemini-model", latencyMs: 1, fallbackUsed: false }));
    const resilient = new ResilientAIProvider(primary, fallback, { retryDelayMs: () => 0 });

    await expect(resilient.generateJSON({ userPrompt: "prompt" })).rejects.toMatchObject({ category: "invalid_schema" });
    expect(primary.generateJSON).toHaveBeenCalledTimes(1);
    expect(fallback.generateJSON).not.toHaveBeenCalled();
  });
});
