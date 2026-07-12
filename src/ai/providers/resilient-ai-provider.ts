import type { AIProviderResult, AITextProvider, GenerateJSONInput, GenerateTextInput } from "./ai-provider";
import { AIProviderError } from "@/lib/error/ai-provider-error";
import { classifyProviderError, isFallbackAllowed } from "@/lib/error/ai-provider-error-classifier";

export class ResilientAIProvider implements AITextProvider {
  readonly name;
  readonly model;

  constructor(private readonly primary: AITextProvider, private readonly fallback?: AITextProvider, private readonly options: { enableFallback?: boolean; maxPrimaryCalls?: number; maxFallbackCalls?: number; retryDelayMs?: (attempt: number) => number } = {}) {
    this.name = primary.name;
    this.model = primary.model;
  }

  generateText(input: GenerateTextInput) { return this.execute((provider) => provider.generateText(input), false); }
  generateJSON<T>(input: GenerateJSONInput) { return this.execute((provider) => provider.generateJSON<T>(input), true); }

  private async execute<T>(call: (provider: AITextProvider) => Promise<AIProviderResult<T>>, allowInvalidResponseRetry: boolean): Promise<AIProviderResult<T>> {
    const maxPrimaryCalls = Math.min(Math.max(this.options.maxPrimaryCalls ?? 2, 1), 2);
    let lastError: AIProviderError | undefined;
    for (let attempt = 1; attempt <= maxPrimaryCalls; attempt += 1) {
      try { return await call(this.primary); } catch (error) {
        lastError = classifyProviderError(error);
        const retryableCategories = allowInvalidResponseRetry
          ? ["rate_limit_error", "provider_unavailable", "provider_timeout", "invalid_json"]
          : ["rate_limit_error", "provider_unavailable", "provider_timeout"];
        const mayRetry = lastError.retryable && retryableCategories.includes(lastError.category) && attempt < maxPrimaryCalls;
        if (!mayRetry) break;
        const delayMs = this.options.retryDelayMs?.(attempt) ?? (1_000 * 3 ** (attempt - 1) + Math.floor(Math.random() * 250));
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    if (this.options.enableFallback !== false && this.fallback && lastError && isFallbackAllowed(lastError) && (this.options.maxFallbackCalls ?? 1) > 0) {
      const result = await call(this.fallback).catch((error) => { throw classifyProviderError(error); });
      return { ...result, fallbackUsed: true };
    }
    throw lastError ?? new AIProviderError({ category: "unknown_ai_error", retryable: false, userMessage: "AI generation failed. Please try again." });
  }
}
