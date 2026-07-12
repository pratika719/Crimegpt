import { AIProviderError, type AIErrorCategory } from "./ai-provider-error";

const USER_MESSAGES: Record<AIErrorCategory, string> = {
  quota_error: "AI quota is currently unavailable. Please try again later.",
  rate_limit_error: "AI service is busy. Please retry shortly.",
  provider_auth_error: "AI provider configuration is invalid. Please contact the project owner.",
  provider_unavailable: "AI provider is temporarily unavailable.",
  provider_timeout: "AI generation timed out. Please try again.",
  embedding_service_unavailable: "AI service is warming up. Please wait and try again shortly.",
  invalid_json: "AI returned an invalid response. Please retry.",
  invalid_schema: "AI returned a response that does not match the required format. Please retry.",
  validation_error: "Validation failed. Please check required fields and try again.",
  configuration_error: "AI provider configuration is invalid. Please contact the project owner.",
  unknown_ai_error: "AI generation failed. Please try again.",
};

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name} ${error.message} ${error.cause instanceof Error ? `${error.cause.name} ${error.cause.message}` : ""}`.trim();
  }
  return typeof error === "string" ? error : "";
}

function statusOf(error: unknown, message: string): number | undefined {
  const value = error as { status?: unknown; statusCode?: unknown; response?: { status?: unknown }; cause?: { status?: unknown; statusCode?: unknown } };
  for (const candidate of [value?.status, value?.statusCode, value?.response?.status, value?.cause?.status, value?.cause?.statusCode]) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) return parsed;
  }
  const match = message.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

export function classifyProviderError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) return error;

  const rawMessage = messageOf(error);
  const message = rawMessage.toLowerCase();
  const statusCode = statusOf(error, rawMessage);
  let category: AIErrorCategory = "unknown_ai_error";
  let retryable = false;

  if (message.includes("quota") || message.includes("resource_exhausted") || message.includes("daily limit")) {
    category = "quota_error";
  } else if (statusCode === 429 || message.includes("rate limit") || message.includes("too many requests") || message.includes("service is busy")) {
    category = "rate_limit_error";
    retryable = true;
  } else if (statusCode === 401 || statusCode === 403 || message.includes("api key") || message.includes("unauthorized") || message.includes("forbidden")) {
    category = "provider_auth_error";
  } else if (message.includes("aborterror") || message.includes("timed out") || message.includes("timeout") || message.includes("etimedout")) {
    category = "provider_timeout";
    retryable = true;
  } else if ((statusCode !== undefined && statusCode >= 500) || message.includes("econnreset") || message.includes("network") || message.includes("fetch failed") || message.includes("temporarily unavailable")) {
    category = "provider_unavailable";
    retryable = true;
  } else if (message.includes("missing api key") || message.includes("unsupported provider") || message.includes("not configured")) {
    category = "configuration_error";
  }

  return new AIProviderError({
    category,
    statusCode,
    retryable,
    userMessage: USER_MESSAGES[category],
    cause: error,
  });
}

export function isFallbackAllowed(error: AIProviderError): boolean {
  return ["quota_error", "rate_limit_error", "provider_auth_error", "provider_unavailable", "provider_timeout", "invalid_json"].includes(error.category);
}
