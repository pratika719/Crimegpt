/**
 * Error Classifier — extensible error classification for queue processors.
 *
 * Uses a registry pattern: add new error types without modifying existing code.
 * Each processor calls `errorClassifier.classify(error)` to get a typed result.
 *
 * Design Principles:
 * - OCP: New error types added via registerHandler(), not by modifying classify()
 * - SRP: Only responsible for error classification, not handling
 * - DIP: Depends on ClassifierFn interface, not concrete implementations
 */

import { Injectable } from '@nestjs/common';
import type {
  ClassifiedError,
  ErrorClassifierFn,
  ErrorMatcherFn,
} from '../types/processor.types';

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

/**
 * NonRetryableError — for validation failures, missing data, etc.
 * These errors should be discarded immediately, not retried.
 */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

// ---------------------------------------------------------------------------
// Error Classifier
// ---------------------------------------------------------------------------

/**
 * Handler registration for a specific error type.
 */
interface ErrorHandler {
  readonly match: ErrorMatcherFn;
  readonly classify: ErrorClassifierFn;
}

/**
 * Extensible error classifier.
 *
 * Usage:
 * ```typescript
 * // In processor
 * const classified = this.errorClassifier.classify(error);
 * if (classified.isDiscardable) await job.discard();
 * ```
 *
 * To add a new error type:
 * ```typescript
 * errorClassifier.registerHandler(
 *   (e) => e instanceof MyCustomError,
 *   (e) => ({
 *     code: 'MY_ERROR',
 *     message: e.message,
 *     userMessage: 'User-friendly message',
 *     failureType: 'transient',
 *     isRetryable: false,
 *     isDiscardable: true,
 *   }),
 * );
 * ```
 */
@Injectable()
export class ErrorClassifier {
  private readonly handlers: ErrorHandler[] = [];

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register a custom error handler.
   * Handlers are checked in order; first match wins.
   */
  registerHandler(match: ErrorMatcherFn, classify: ErrorClassifierFn): void {
    this.handlers.push({ match, classify });
  }

  /**
   * Classify an error into a structured result.
   * Falls back to a default transient error if no handler matches.
   */
  classify(error: unknown): ClassifiedError {
    for (const handler of this.handlers) {
      if (handler.match(error)) {
        return handler.classify(error);
      }
    }

    // Default: unknown transient error, retryable
    return {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : String(error),
      userMessage: 'An unexpected error occurred.',
      failureType: 'transient',
      isRetryable: true,
      isDiscardable: false,
    };
  }

  // -------------------------------------------------------------------------
  // Default Handlers
  // -------------------------------------------------------------------------

  private registerDefaultHandlers(): void {
    // 1. Quota/Rate Limit (429) → discard immediately
    this.registerHandler(
      (e) => this.isQuotaError(e),
      (e) => ({
        code: 'AI_PROVIDER_OVERLOADED',
        message: e instanceof Error ? e.message : String(e),
        userMessage:
          'AI service is currently overloaded. Please wait a moment and try again.',
        failureType: 'transient' as const,
        isRetryable: false,
        isDiscardable: true,
      }),
    );

    // 2. Non-retryable errors → discard immediately
    this.registerHandler(
      (e) => e instanceof NonRetryableError,
      (e) => ({
        code: 'VALIDATION_ERROR',
        message: e instanceof Error ? e.message : String(e),
        userMessage:
          e instanceof Error ? e.message : 'Validation failed.',
        failureType: 'permanent' as const,
        isRetryable: false,
        isDiscardable: true,
      }),
    );

    // 3. AI Provider errors (non-429) → retryable
    this.registerHandler(
      (e) => this.isAIProviderError(e),
      (e) => ({
        code: 'AI_PROVIDER_ERROR',
        message: e instanceof Error ? e.message : String(e),
        userMessage: 'AI generation failed. Retrying...',
        failureType: 'transient' as const,
        isRetryable: true,
        isDiscardable: false,
      }),
    );

    // 4. Timeout errors → retryable
    this.registerHandler(
      (e) => this.isTimeoutError(e),
      (e) => ({
        code: 'TIMEOUT_ERROR',
        message: e instanceof Error ? e.message : String(e),
        userMessage: 'Request timed out. Retrying...',
        failureType: 'transient' as const,
        isRetryable: true,
        isDiscardable: false,
      }),
    );
  }

  // -------------------------------------------------------------------------
  // Error Matchers
  // -------------------------------------------------------------------------

  /**
   * Check if error is a quota/rate limit error (429).
   */
  private isQuotaError(error: unknown): boolean {
    // Check for AIProviderError with 429
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error
    ) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 429) return true;
    }

    // Check error message for quota indicators
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return (
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('too many requests') ||
        msg.includes('rate limit')
      );
    }

    return false;
  }

  /**
   * Check if error is an AI provider error (non-429).
   */
  private isAIProviderError(error: unknown): boolean {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: string }).name === 'AIProviderError'
    ) {
      return true;
    }

    // Check for status code in 5xx range
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error
    ) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status !== undefined && status >= 500 && status < 600) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if error is a timeout error.
   */
  private isTimeoutError(error: unknown): boolean {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: string }).name === 'AITimeoutError'
    ) {
      return true;
    }

    if (error instanceof Error) {
      return error.message.toLowerCase().includes('timeout');
    }

    return false;
  }
}
