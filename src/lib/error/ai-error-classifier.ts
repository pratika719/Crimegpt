import type { AIErrorCategory } from "./ai-provider-error";
export type { AIErrorCategory };

export type ClassifiedAIError = {
  category: AIErrorCategory;
  retryable: boolean;
  userMessage: string;
  statusCode?: number;
};

const QUOTA_MESSAGE = "AI quota limit reached for today. Please try again later.";
const EMBEDDING_MESSAGE = "AI service is warming up. Please wait and try again shortly.";
const PROVIDER_AUTH_MESSAGE =
  "AI provider configuration is invalid. Please contact the project owner.";
const UNKNOWN_MESSAGE = "AI generation failed. Please try again.";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? ` ${error.cause.message}` : "";
    return `${error.message}${cause}`;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getStatusCode(error: unknown, message: string): number | undefined {
  const maybeError = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
    cause?: { status?: unknown; statusCode?: unknown };
  };

  const candidates = [
    maybeError?.status,
    maybeError?.statusCode,
    maybeError?.response?.status,
    maybeError?.cause?.status,
    maybeError?.cause?.statusCode,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) {
      return parsed;
    }
  }

  const match = message.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

export function classifyAIError(error: unknown): ClassifiedAIError {
  const domainError = error as {
    category?: AIErrorCategory;
    retryable?: boolean;
    message?: string;
    options?: {
      category?: AIErrorCategory;
      retryable?: boolean;
      statusCode?: number;
    };
  };
  const explicitCategory = domainError?.category ?? domainError?.options?.category;

  if (explicitCategory) {
    const retryable =
      domainError.retryable ?? domainError.options?.retryable ?? explicitCategory === "unknown_ai_error";
    return {
      category: explicitCategory,
      retryable,
      userMessage: domainError.message || UNKNOWN_MESSAGE,
      statusCode: domainError.options?.statusCode,
    };
  }

  const rawMessage = getErrorMessage(error);
  const message = rawMessage.toLowerCase();
  const statusCode = getStatusCode(error, rawMessage);

  if (
    statusCode === 429 ||
    message.includes("too many requests") ||
    message.includes("quota exceeded") ||
    message.includes("generaterequestsperdayperprojectpermodel-freetier") ||
    message.includes("generate_content_free_tier_requests") ||
    (message.includes("gemini") && message.includes("quota"))
  ) {
    return {
      category: "quota_error",
      retryable: false,
      userMessage: QUOTA_MESSAGE,
      statusCode,
    };
  }

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    message.includes("invalid api key") ||
    message.includes("api key not valid") ||
    message.includes("permission denied") ||
    message.includes("unauthorized") ||
    message.includes("forbidden")
  ) {
    return {
      category: "provider_auth_error",
      retryable: false,
      userMessage: PROVIDER_AUTH_MESSAGE,
      statusCode,
    };
  }

  if (
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    message.includes("fastapi embedding request failed") ||
    message.includes("fetch timeout") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("service unavailable") ||
    message.includes("bad gateway") ||
    message.includes("gateway timeout")
  ) {
    return {
      category: "embedding_service_unavailable",
      retryable: true,
      userMessage: EMBEDDING_MESSAGE,
      statusCode,
    };
  }

  if (
    message.includes("validation failed") ||
    message.includes("missing required") ||
    message.includes("before generating")
  ) {
    return {
      category: "validation_error",
      retryable: false,
      userMessage: rawMessage.replace(/^Validation Failed:\s*/i, ""),
      statusCode,
    };
  }

  return {
    category: "unknown_ai_error",
    retryable: true,
    userMessage: UNKNOWN_MESSAGE,
    statusCode,
  };
}

export function truncateExternalErrorBody(body: string, maxLength = 300): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized;
}
