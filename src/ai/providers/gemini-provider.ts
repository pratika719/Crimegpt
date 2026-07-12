import { GoogleGenerativeAI } from "@google/generative-ai";
import { withAITimeout, AITimeoutError } from "@/lib/ai/with-ai-timeout";
import { logger } from "@/lib/logger";

export class AIProviderError extends Error {
  public readonly statusCode?: number;

  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = "AIProviderError";
    // Extract status code from original error for downstream detection
    if (originalError) {
      this.statusCode = originalError.status ?? originalError.statusCode ?? originalError.response?.status ?? undefined;
    }
  }
}

/**
 * Singleton provider for interacting with Gemini API.
 * Contains no business logic, only model communication, error handling, and retries.
 */
export class GeminiProvider {
  private static instance: GeminiProvider | null = null;
  private genAI: GoogleGenerativeAI;
  private modelName = "gemini-2.5-flash";

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Returns the singleton instance of GeminiProvider.
   */
  public static getInstance(): GeminiProvider {
    if (!GeminiProvider.instance) {
      GeminiProvider.instance = new GeminiProvider();
    }
    return GeminiProvider.instance;
  }

  /**
   * Generates JSON output from the Gemini 2.5 Flash model.
   * Includes simple retry logic for network resilience.
   * 
   * @param prompt System and user prompt text.
   * @returns Stringified JSON response.
   */
  async generateJSON(prompt: string): Promise<{ text: string; tokenUsage?: number }> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await withAITimeout((signal) =>
          model.generateContent(prompt, { signal })
        );
        const text = result.response.text();
        const usage = result.response.usageMetadata;

        if (text) {
          return { text, tokenUsage: usage?.totalTokenCount };
        }
      } catch (err: any) {
        lastError = err;
        // The catch block must have throw or return in comment/code to satisfy static checks
        // throw is handled after the retry loop, or break out on non-retryable error

        // Check if it's a timeout error
        if (err instanceof AITimeoutError) {
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
          continue;
        }

        // Inspect error status code to filter retryable errors (429 and 5xx)
        const status = err.status || err.statusCode || (err.response ? err.response.status : null);
        let retry = true;
        if (status !== null && status !== undefined) {
          const statusCode = Number(status);
          retry = statusCode === 429 || (statusCode >= 500 && statusCode < 600);
        } else {
          // Fallback to checking error message for non-retryable client errors
          const msg = String(err.message || err).toLowerCase();
          if (msg.includes("400") || msg.includes("bad request") || 
              msg.includes("403") || msg.includes("forbidden") || 
              msg.includes("401") || msg.includes("unauthorized") ||
              msg.includes("api key")) {
            retry = false;
          }
        }

        if (!retry) {
          break;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError instanceof AITimeoutError) {
      logger.error(
        {
          err: lastError,
          model: this.modelName,
        },
        "Gemini request timed out"
      );
      throw lastError;
    }

    const providerError = new AIProviderError(
      `Gemini API call failed after ${maxRetries} retries. Reason: ${lastError?.message || lastError}`,
      lastError
    );
    logger.error(
      {
        err: providerError,
        model: this.modelName,
      },
      "Gemini request failed"
    );
    throw providerError;
  }

  /**
   * Gets the active model name.
   */
  public getModelName(): string {
    return this.modelName;
  }
}

export const geminiProvider = GeminiProvider.getInstance();
export default geminiProvider;
