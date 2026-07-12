import type { AIProviderName } from "@/ai/providers/ai-provider";

export type AIErrorCategory =
  | "quota_error"
  | "rate_limit_error"
  | "provider_auth_error"
  | "provider_unavailable"
  | "provider_timeout"
  | "embedding_service_unavailable"
  | "invalid_json"
  | "invalid_schema"
  | "validation_error"
  | "configuration_error"
  | "unknown_ai_error";

export type AIProviderErrorOptions = {
  category: AIErrorCategory;
  provider?: AIProviderName;
  model?: string;
  statusCode?: number;
  retryable: boolean;
  userMessage: string;
  retryAfterMs?: number;
  safeDetails?: Record<string, unknown>;
  cause?: unknown;
};

export class AIProviderError extends Error {
  readonly category: AIErrorCategory;
  readonly provider?: AIProviderName;
  readonly model?: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly userMessage: string;
  readonly retryAfterMs?: number;
  readonly safeDetails?: Record<string, unknown>;

  constructor(options: AIProviderErrorOptions) {
    super(options.userMessage);
    this.name = "AIProviderError";
    this.category = options.category;
    this.provider = options.provider;
    this.model = options.model;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable;
    this.userMessage = options.userMessage;
    this.retryAfterMs = options.retryAfterMs;
    this.safeDetails = options.safeDetails;
    if (options.cause) this.cause = options.cause;
  }
}

export class InvalidAIResponseError extends AIProviderError {
  constructor(options: Omit<AIProviderErrorOptions, "category" | "retryable" | "userMessage"> & {
    category?: "invalid_json" | "invalid_schema";
    userMessage?: string;
  } = {}) {
    const category = options.category ?? "invalid_json";
    super({
      ...options,
      category,
      retryable: true,
      userMessage:
        options.userMessage ??
        (category === "invalid_schema"
          ? "AI returned a response that does not match the required format. Please retry."
          : "AI returned an invalid response. Please retry."),
    });
    this.name = "InvalidAIResponseError";
  }
}
