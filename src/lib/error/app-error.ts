import type { AIErrorCategory } from "@/lib/error/ai-provider-error";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly options?: {
      category?: AIErrorCategory;
      retryable?: boolean;
      statusCode?: number;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "AppError";

    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  get retryable() {
    return this.options?.retryable ?? false;
  }

  get category() {
    return this.options?.category;
  }
}
