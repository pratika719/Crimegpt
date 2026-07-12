import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProviderResult, AITextProvider, GenerateJSONInput, GenerateTextInput } from "./ai-provider";
import { JSON_ONLY_INSTRUCTIONS } from "./ai-provider";
import { extractJSONFromLLMResponse } from "@/ai/utils/json-response-parser";
import { AIProviderError } from "@/lib/error/ai-provider-error";
import { classifyProviderError } from "@/lib/error/ai-provider-error-classifier";
import { withAITimeout } from "@/lib/ai/with-ai-timeout";

export class GeminiTextProvider implements AITextProvider {
  readonly name = "gemini" as const;
  readonly model: string;
  private readonly genAI: GoogleGenerativeAI;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? "";
    this.model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
    if (!apiKey) throw new AIProviderError({ category: "configuration_error", provider: this.name, model: this.model, retryable: false, userMessage: "AI provider configuration is invalid. Please contact the project owner.", safeDetails: { missing: "GEMINI_API_KEY" } });
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateText(input: GenerateTextInput): Promise<AIProviderResult<string>> {
    const startedAt = Date.now();
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model, systemInstruction: input.systemPrompt, generationConfig: { temperature: input.temperature ?? 0.1, maxOutputTokens: input.maxTokens ?? 4_000 } });
      const result = await withAITimeout((signal) => model.generateContent(input.userPrompt, { signal }), input.timeoutMs ?? 60_000);
      const data = result.response.text();
      if (!data) throw new AIProviderError({ category: "invalid_json", provider: this.name, model: this.model, retryable: true, userMessage: "AI returned an invalid response. Please retry." });
      const usage = result.response.usageMetadata;
      return { data, provider: this.name, model: this.model, latencyMs: Date.now() - startedAt, usage: { promptTokens: usage?.promptTokenCount, completionTokens: usage?.candidatesTokenCount, totalTokens: usage?.totalTokenCount }, fallbackUsed: false };
    } catch (error) { throw this.convertError(error); }
  }

  async generateJSON<T>(input: GenerateJSONInput): Promise<AIProviderResult<T>> {
    const startedAt = Date.now();
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model, systemInstruction: [input.systemPrompt, JSON_ONLY_INSTRUCTIONS, input.schemaDescription].filter(Boolean).join("\n\n"), generationConfig: { responseMimeType: "application/json", temperature: input.temperature ?? 0.1, maxOutputTokens: input.maxTokens ?? 4_000 } });
      const response = await withAITimeout((signal) => model.generateContent(input.userPrompt, { signal }), input.timeoutMs ?? 60_000);
      const usage = response.response.usageMetadata;
      return { data: extractJSONFromLLMResponse<T>(response.response.text()), provider: this.name, model: this.model, latencyMs: Date.now() - startedAt, usage: { promptTokens: usage?.promptTokenCount, completionTokens: usage?.candidatesTokenCount, totalTokens: usage?.totalTokenCount }, fallbackUsed: false };
    } catch (error) { throw this.convertError(error); }
  }

  private convertError(error: unknown): AIProviderError {
    const classified = classifyProviderError(error);
    if (classified.provider) return classified;
    return new AIProviderError({ category: classified.category, provider: this.name, model: this.model, statusCode: classified.statusCode, retryable: classified.retryable, userMessage: classified.userMessage, cause: error });
  }
}
