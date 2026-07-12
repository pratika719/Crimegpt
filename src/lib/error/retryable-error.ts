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