export class RetryableError extends Error {
  readonly retryable = true;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "RetryableError";

    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

export class NonRetryableError extends Error {
  readonly retryable = false;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "NonRetryableError";

    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof RetryableError) {
    return true;
  }

  if (error instanceof NonRetryableError) {
    return false;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("temporarily") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("504")
  );
}