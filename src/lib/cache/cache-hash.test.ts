import { describe, expect, it } from "vitest";
import { createCacheHash } from "@/lib/cache/cache-hash";

describe("createCacheHash", () => {
  it("creates the same hash for objects with different key order", () => {
    const first = createCacheHash({
      text: "robbery",
      model: "all-MiniLM-L6-v2",
      options: { limit: 5, jurisdiction: "IN" },
    });

    const second = createCacheHash({
      options: { jurisdiction: "IN", limit: 5 },
      model: "all-MiniLM-L6-v2",
      text: "robbery",
    });

    expect(first).toBe(second);
  });

  it("creates different hashes for different input", () => {
    const first = createCacheHash({ text: "robbery" });
    const second = createCacheHash({ text: "murder" });

    expect(first).not.toBe(second);
  });

  it("preserves array order — [a,b] and [b,a] must differ", () => {
    const first = createCacheHash({ values: ["a", "b"] });
    const second = createCacheHash({ values: ["b", "a"] });

    expect(first).not.toBe(second);
  });

  it("returns a consistent 64-character hex string", () => {
    const hash = createCacheHash({ query: "test", topK: 5 });

    expect(typeof hash).toBe("string");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it("sorts nested object keys consistently", () => {
    const first = createCacheHash({ a: { z: 1, m: 2, a: 3 } });
    const second = createCacheHash({ a: { a: 3, m: 2, z: 1 } });

    expect(first).toBe(second);
  });
});
