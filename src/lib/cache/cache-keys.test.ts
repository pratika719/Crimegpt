import { describe, expect, it } from "vitest";
import { cacheKeys } from "@/lib/cache/cache-keys";

describe("cacheKeys", () => {
  it("creates query embedding cache key with correct prefix", () => {
    expect(cacheKeys.queryEmbedding("abc123")).toBe(
      "cache:query-embedding:abc123",
    );
  });

  it("creates law retrieval cache key with correct prefix", () => {
    expect(cacheKeys.lawRetrieval("def456")).toBe("cache:law-retrieval:def456");
  });

  it("creates case dashboard cache key scoped by userId", () => {
    expect(cacheKeys.caseDashboard("user_1")).toBe(
      "cache:case-dashboard:user_1",
    );
  });

  it("creates case detail cache key scoped by userId and caseId", () => {
    expect(cacheKeys.caseDetail("user_1", "case_1")).toBe(
      "cache:case-detail:user_1:case_1",
    );
  });

  it("creates case search cache key scoped by userId and query hash", () => {
    expect(cacheKeys.caseSearch("user_1", "hash_abc")).toBe(
      "cache:case-search:user_1:hash_abc",
    );
  });

  it("creates ai summary cache key scoped by caseId", () => {
    expect(cacheKeys.aiSummary("case_1")).toBe("cache:ai-summary:case_1");
  });

  it("different user IDs produce different dashboard keys", () => {
    expect(cacheKeys.caseDashboard("user_1")).not.toBe(
      cacheKeys.caseDashboard("user_2"),
    );
  });

  it("different case IDs produce different detail keys for same user", () => {
    expect(cacheKeys.caseDetail("user_1", "case_1")).not.toBe(
      cacheKeys.caseDetail("user_1", "case_2"),
    );
  });
});
