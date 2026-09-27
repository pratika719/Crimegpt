/**
 * index.d.ts — Global type declarations
 *
 * Provides TypeScript with project-wide ambient types: typed environment
 * variables, custom error classes, branded entity IDs, and utility types.
 *
 * These declarations are automatically available in every .ts / .tsx file
 * thanks to the tsconfig "include" array.
 */

// ============================================================================
// Environment Variables (matches .env.example + src/env.ts)
// ============================================================================

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: "development" | "test" | "production";
    readonly NESTJS_API_URL?: string;
  }
}

// ============================================================================
// Custom Error Classes (available everywhere without import)
// ============================================================================

declare class AITimeoutError extends Error {
  constructor(message?: string);
}

declare class AIProviderError extends Error {
  constructor(message?: string, provider?: string);
}

declare class UnauthorizedError extends Error {
  constructor();
}

declare class NonRetryableError extends Error {
  constructor(message: string);
}

// ============================================================================
// Branded Types — type-safe entity IDs
// ============================================================================

type Brand<K, T> = T & { readonly __brand: K };

type CaseId = Brand<"CaseId", string>;
type UserId = Brand<"UserId", string>;
type PersonId = Brand<"PersonId", string>;
type EvidenceId = Brand<"EvidenceId", string>;
type DocumentId = Brand<"DocumentId", string>;
type ActivityId = Brand<"ActivityId", string>;
type RequestId = Brand<"RequestId", string>;

// ============================================================================
// Utility Types
// ============================================================================

/** Make specific properties required while keeping the rest unchanged */
type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Make specific properties optional while keeping the rest unchanged */
type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Extract the success variant from an ActionResponse union */
type ExtractSuccess<T> = T extends { success: true } ? T : never;

/** Extract the failure variant from an ActionResponse union */
type ExtractFailure<T> = T extends { success: false } ? T : never;

/** Guarantee a value is non-nullable */
type Ensure<T> = T extends null | undefined ? never : T;

/** Extract a string union from a Prisma-style enum object */
type PrismaEnum<T extends { [K: string]: string }> = T[keyof T];

// ============================================================================
// Global Constants
// ============================================================================

declare const APP_NAME: "CrimeGPT";

declare const DEFAULT_PAGE_SIZE: 20;
declare const MAX_PAGE_SIZE: 100;

/** Cache TTL constants in seconds */
declare const CACHE_TTL: {
  readonly CASE_DASHBOARD: 300;
  readonly CASE_DETAIL: 600;
  readonly SEARCH_RESULTS: 120;
  readonly AI_DIAGNOSTICS: 21600;
  readonly LEGAL_SECTIONS: 21600;
};

export {};
