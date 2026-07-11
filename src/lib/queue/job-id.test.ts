import { describe, expect, it } from "vitest";
import { createSafeJobId } from "@/lib/queue/job-id";

describe("createSafeJobId", () => {
  it("replaces colons with double underscores (BullMQ does not allow colons in job IDs)", () => {
    const jobId = createSafeJobId(["document-generation", "case:123", "FIR"]);

    expect(jobId).not.toContain(":");
    expect(jobId).toContain("case__123");
  });

  it("joins parts with double underscore separator", () => {
    const jobId = createSafeJobId(["part_a", "part_b"]);

    expect(jobId).toBe("part_a__part_b");
  });

  it("replaces spaces with underscores", () => {
    const jobId = createSafeJobId(["case one", "FIR"]);

    expect(jobId).toBe("case_one__FIR");
  });

  it("sanitizes special characters to underscores", () => {
    const jobId = createSafeJobId(["case@123", "FIR/REPORT"]);

    expect(jobId).toBe("case_123__FIR_REPORT");
  });

  it("filters out null parts", () => {
    const jobId = createSafeJobId(["case_1", null, "FIR"]);

    expect(jobId).toBe("case_1__FIR");
  });

  it("filters out undefined parts", () => {
    const jobId = createSafeJobId(["case_1", undefined, "FIR"]);

    expect(jobId).toBe("case_1__FIR");
  });

  it("handles numbers and booleans as parts", () => {
    const jobId = createSafeJobId(["queue", 42, true]);

    expect(jobId).toBe("queue__42__true");
  });

  it("produces a single part when given one non-null value", () => {
    const jobId = createSafeJobId(["only-one"]);

    expect(jobId).toBe("only-one");
  });
});
