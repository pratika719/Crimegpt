/**
 * AI-specific error classes.
 *
 * Extracted from gemini.provider.ts to follow SRP.
 * These errors are used across the AI module.
 */

/**
 * Error thrown when the AI provider (Gemini) fails.
 *
 * Includes the HTTP status code when available, enabling
 * callers to classify errors (e.g., 429 for rate limiting).
 */
export class AIProviderError extends Error {
  public readonly statusCode?: number;

  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'AIProviderError';

    // Extract status code from various error shapes
    const raw = originalError as Record<string, unknown> | undefined;
    const resp = raw?.response as Record<string, unknown> | undefined;
    const code = raw?.status ?? raw?.statusCode ?? resp?.status ?? undefined;

    if (code !== undefined) {
      this.statusCode = Number(code);
    } else if (typeof message === 'string') {
      // Fallback: detect 429 from error message
      const lower = message.toLowerCase();
      if (
        lower.includes('429') ||
        lower.includes('quota') ||
        lower.includes('too many requests')
      ) {
        this.statusCode = 429;
      }
    }
  }
}

/**
 * Error thrown when an AI operation times out.
 */
export class AITimeoutError extends Error {
  constructor(message = 'AI operations timed out.') {
    super(message);
    this.name = 'AITimeoutError';
  }
}
