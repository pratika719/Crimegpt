import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIProviderError,
  AITimeoutError,
} from '../errors/ai-errors';
import {
  CIRCUIT_BREAKER_THRESHOLD,
  CIRCUIT_BREAKER_RESET_MS,
  GEMINI_DEFAULT_TIMEOUT_MS,
  GEMINI_MAX_RETRIES,
} from '../constants/ai.constants';

// Re-export errors for backward compatibility
export { AIProviderError, AITimeoutError };

// ---------------------------------------------------------------------------
// Circuit breaker state
// ---------------------------------------------------------------------------

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

// ---------------------------------------------------------------------------
// GeminiService
// ---------------------------------------------------------------------------

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger(GeminiService.name);
  private genAI!: GoogleGenerativeAI;
  private modelName!: string;

  private readonly circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    state: 'CLOSED',
  };

  private readonly circuitBreakerThreshold = CIRCUIT_BREAKER_THRESHOLD;
  private readonly circuitBreakerResetMs = CIRCUIT_BREAKER_RESET_MS;
  private readonly defaultTimeoutMs = GEMINI_DEFAULT_TIMEOUT_MS;
  private readonly maxRetries = GEMINI_MAX_RETRIES;

  constructor(private readonly config: ConfigService) {}

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  onModuleInit() {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment variables.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = this.config.get<string>('GEMINI_MODEL', 'gemini-2.5-flash');
    this.logger.log(`GeminiService initialised (model: ${this.modelName})`);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Generate a JSON response from Gemini.
   *
   * Includes a single retry for transient errors (429, 5xx) and a circuit
   * breaker that fast-fails when the provider is degraded.
   */
  async generateJSON(
    prompt: string,
    opts?: { systemInstruction?: string; timeoutMs?: number },
  ): Promise<{ text: string; tokenUsage?: number }> {
    this.assertCircuitOpen();

    const timeoutMs = opts?.timeoutMs ?? this.defaultTimeoutMs;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          ...(opts?.systemInstruction
            ? { systemInstruction: opts.systemInstruction }
            : {}),
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const result = await this.withTimeout(
          (signal) => model.generateContent(prompt, { signal }),
          timeoutMs,
        );

        const text = result.response.text();
        const usage = result.response.usageMetadata;

        if (text) {
          this.recordSuccess();
          return { text, tokenUsage: usage?.totalTokenCount };
        }
      } catch (err: unknown) {
        lastError = err;

        if (err instanceof AITimeoutError) {
          this.recordFailure();
          if (attempt < this.maxRetries) {
            await this.delay(this.backoffMs(attempt));
            continue;
          }
          break;
        }

        const status = this.extractStatus(err);
        const retryable = status === 429 || (status !== null && status >= 500 && status < 600);

        if (!retryable) break;

        if (attempt < this.maxRetries) {
          await this.delay(this.backoffMs(attempt));
        }
      }
    }

    this.recordFailure();

    if (lastError instanceof AITimeoutError) {
      this.logger.error({ model: this.modelName }, 'Gemini request timed out');
      throw lastError;
    }

    const providerError = new AIProviderError(
      `Gemini API call failed after ${this.maxRetries} retries. Reason: ${(lastError as Error)?.message ?? lastError}`,
      lastError,
    );
    this.logger.error({ model: this.modelName }, 'Gemini request failed');
    throw providerError;
  }

  getModelName(): string {
    return this.modelName;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private withTimeout<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    ms: number,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);

    return fn(controller.signal).finally(() => clearTimeout(timer));
  }

  private assertCircuitOpen() {
    const cb = this.circuitBreaker;
    if (cb.state === 'OPEN') {
      if (Date.now() - cb.lastFailure > this.circuitBreakerResetMs) {
        cb.state = 'HALF_OPEN';
        this.logger.warn('Circuit breaker moved to HALF_OPEN');
      } else {
        throw new AIProviderError('Gemini circuit breaker is OPEN — service unavailable');
      }
    }
  }

  private recordSuccess() {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.state = 'CLOSED';
  }

  private recordFailure() {
    const cb = this.circuitBreaker;
    cb.failures += 1;
    cb.lastFailure = Date.now();
    if (cb.failures >= this.circuitBreakerThreshold) {
      cb.state = 'OPEN';
      this.logger.warn(
        { failures: cb.failures },
        'Circuit breaker OPENED — fast-failing for 30s',
      );
    }
  }

  private extractStatus(err: unknown): number | null {
    const e = err as Record<string, unknown>;
    const val = e?.status ?? e?.statusCode ?? (e?.response as Record<string, unknown>)?.status;
    return val !== undefined ? Number(val) : null;
  }

  private backoffMs(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30_000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
