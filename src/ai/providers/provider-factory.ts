import type { AIProviderName, AITextProvider } from "./ai-provider";
import { GeminiTextProvider } from "./gemini-text-provider";
import { GroqLlamaProvider } from "./groq-provider";
import { ResilientAIProvider } from "./resilient-ai-provider";
import { AIProviderError } from "@/lib/error/ai-provider-error";
import { diagnosticFlags } from "@/lib/ai/diagnostic-flags";

let providerSingleton: AITextProvider | undefined;

export function createAIProvider(name: string = process.env.AI_PROVIDER ?? "groq"): AITextProvider {
  if (name === "groq") return new GroqLlamaProvider();
  if (name === "gemini") return new GeminiTextProvider();
  throw new AIProviderError({ category: "configuration_error", retryable: false, userMessage: "AI provider configuration is invalid. Please contact the project owner.", safeDetails: { unsupportedProvider: name } });
}

export function getResilientAIProvider(): AITextProvider {
  if (providerSingleton) return providerSingleton;
  const primaryName = (process.env.AI_PROVIDER ?? "groq") as AIProviderName;
  const fallbackEnabled =
    (process.env.ENABLE_AI_FALLBACK ?? "true").toLowerCase() === "true" &&
    diagnosticFlags.useFallback();
  const fallbackName = (process.env.AI_FALLBACK_PROVIDER ?? "gemini") as AIProviderName;
  const primary = createAIProvider(primaryName);
  const fallback = fallbackEnabled && fallbackName !== primaryName ? createAIProvider(fallbackName) : undefined;
  providerSingleton = new ResilientAIProvider(primary, fallback, { enableFallback: fallbackEnabled, maxPrimaryCalls: 2, maxFallbackCalls: 1 });
  return providerSingleton;
}

export function resetAIProviderForTests(): void { providerSingleton = undefined; }
