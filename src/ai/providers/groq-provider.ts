import type { AIProviderResult, AITextProvider, GenerateJSONInput, GenerateTextInput } from "./ai-provider";
import { JSON_ONLY_INSTRUCTIONS } from "./ai-provider";
import { extractJSONFromLLMResponse } from "@/ai/utils/json-response-parser";
import { AIProviderError } from "@/lib/error/ai-provider-error";
import { classifyProviderError } from "@/lib/error/ai-provider-error-classifier";

type GroqResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export class GroqLlamaProvider implements AITextProvider {
  readonly name = "groq" as const;
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;

  constructor(options: { apiKey?: string; model?: string; baseUrl?: string; timeoutMs?: number } = {}) {
    this.apiKey = options.apiKey ?? process.env.GROQ_API_KEY ?? "";
    this.model = options.model ?? process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
    this.baseUrl = (options.baseUrl ?? process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
    this.defaultTimeoutMs = options.timeoutMs ?? Number(process.env.GROQ_REQUEST_TIMEOUT_MS ?? 60_000);
    if (!this.apiKey) {
      throw new AIProviderError({ category: "configuration_error", provider: this.name, model: this.model, retryable: false, userMessage: "AI provider configuration is invalid. Please contact the project owner.", safeDetails: { missing: "GROQ_API_KEY" } });
    }
  }

  async generateText(input: GenerateTextInput): Promise<AIProviderResult<string>> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? this.defaultTimeoutMs);
    try {
      const messages = [
        ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
        { role: "user", content: input.userPrompt },
      ];
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, messages, temperature: input.temperature ?? 0.1, max_tokens: input.maxTokens ?? 4_000 }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const retryAfterSeconds = Number(response.headers.get("retry-after"));
        const retryAfterMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1_000 : undefined;
        const safeBody = (await response.text()).slice(0, 1_000).toLowerCase();
        const quotaExhausted = response.status === 429 && /quota|tokens per day|requests per day|resource_exhausted/.test(safeBody);
        const category = quotaExhausted
          ? "quota_error"
          : response.status === 429
            ? "rate_limit_error"
            : response.status === 401 || response.status === 403
              ? "provider_auth_error"
              : response.status >= 500
                ? "provider_unavailable"
                : "unknown_ai_error";
        const shortRateLimit = category === "rate_limit_error" && (retryAfterMs === undefined || retryAfterMs <= 3_000);
        throw new AIProviderError({
          category,
          provider: this.name,
          model: this.model,
          statusCode: response.status,
          retryable: category === "provider_unavailable" || shortRateLimit,
          userMessage: category === "quota_error"
            ? "AI quota is currently unavailable. Please try again later."
            : category === "rate_limit_error"
              ? "AI service is busy. Please retry shortly."
              : category === "provider_auth_error"
                ? "AI provider configuration is invalid. Please contact the project owner."
                : category === "provider_unavailable"
                  ? "AI provider is temporarily unavailable."
                  : "AI generation failed. Please try again.",
          retryAfterMs,
        });
      }
      const payload = (await response.json()) as GroqResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new AIProviderError({ category: "invalid_json", provider: this.name, model: this.model, retryable: true, userMessage: "AI returned an invalid response. Please retry.", safeDetails: { reason: "empty_content" } });
      return { data: content, provider: this.name, model: this.model, latencyMs: Date.now() - startedAt, usage: { promptTokens: payload.usage?.prompt_tokens, completionTokens: payload.usage?.completion_tokens, totalTokens: payload.usage?.total_tokens }, fallbackUsed: false };
    } catch (error) {
      const classified = classifyProviderError(error);
      if (classified.provider) throw classified;
      throw new AIProviderError({ category: classified.category, provider: this.name, model: this.model, statusCode: classified.statusCode, retryable: classified.retryable, userMessage: classified.userMessage, cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateJSON<T>(input: GenerateJSONInput): Promise<AIProviderResult<T>> {
    const result = await this.generateText({ ...input, systemPrompt: [input.systemPrompt, JSON_ONLY_INSTRUCTIONS, input.schemaDescription].filter(Boolean).join("\n\n") });
    try {
      return { ...result, data: extractJSONFromLLMResponse<T>(result.data) };
    } catch (error) {
      console.error("❌ Groq raw response that failed JSON parsing:\n", result.data);
      if (error instanceof AIProviderError) {
        throw new AIProviderError({ category: error.category, provider: this.name, model: this.model, retryable: error.retryable, userMessage: error.userMessage, safeDetails: error.safeDetails, cause: error });
      }
      throw error;
    }
  }
}
