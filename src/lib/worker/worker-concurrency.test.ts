import { afterEach, describe, expect, it } from "vitest";

/**
 * WORKER_CONCURRENCY is evaluated at module import time, so we need
 * vi.resetModules() + dynamic import to test different env configurations.
 */
async function loadConcurrency() {
  const { WORKER_CONCURRENCY } = await import(
    "@/lib/worker/worker-concurrency"
  );
  return WORKER_CONCURRENCY;
}

describe("WORKER_CONCURRENCY", () => {
  afterEach(() => {
    // Clean up env overrides after each test
    delete process.env.DOCUMENT_GENERATION_CONCURRENCY;
    delete process.env.EMBEDDING_CONCURRENCY;
    delete process.env.INGESTION_CONCURRENCY;
    delete process.env.EMAIL_CONCURRENCY;
    delete process.env.CLEANUP_CONCURRENCY;
  });

  it("uses correct fallback defaults when env vars are absent", async () => {
    const { vi } = await import("vitest");
    vi.resetModules();

    const conc = await loadConcurrency();

    expect(conc.DOCUMENT_GENERATION).toBe(1);
    expect(conc.EMBEDDING).toBe(2);
    expect(conc.INGESTION).toBe(1);
    expect(conc.EMAIL).toBe(2);
    expect(conc.CLEANUP).toBe(1);
  });

  it("parses valid integer from env variable", async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    process.env.DOCUMENT_GENERATION_CONCURRENCY = "3";
    process.env.EMBEDDING_CONCURRENCY = "4";

    const conc = await loadConcurrency();

    expect(conc.DOCUMENT_GENERATION).toBe(3);
    expect(conc.EMBEDDING).toBe(4);
  });

  it("falls back for non-integer env value", async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    process.env.DOCUMENT_GENERATION_CONCURRENCY = "abc";

    const conc = await loadConcurrency();

    expect(conc.DOCUMENT_GENERATION).toBe(1);
  });

  it("falls back for zero (concurrency must be >= 1)", async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    process.env.EMBEDDING_CONCURRENCY = "0";

    const conc = await loadConcurrency();

    expect(conc.EMBEDDING).toBe(2);
  });

  it("falls back for negative values", async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    process.env.CLEANUP_CONCURRENCY = "-5";

    const conc = await loadConcurrency();

    expect(conc.CLEANUP).toBe(1);
  });

  it("falls back for floating point values", async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    process.env.EMAIL_CONCURRENCY = "1.5";

    const conc = await loadConcurrency();

    expect(conc.EMAIL).toBe(2);
  });
});
