import { describe, expect, it } from "vitest";
import { RemandRequestSchema } from "@/features/case/schemas/remand-request.schema";
import {
  DocumentGenerationError,
  buildRepairPrompt,
  documentTypeLabel,
  formatDocumentValidationError,
  getDocumentErrorMeta,
  isDocumentGenerationError,
} from "@/lib/error/document-error";

describe("DocumentGenerationError", () => {
  it("extends Error and is non-retryable", () => {
    const err = new DocumentGenerationError("boom", {
      code: "VALIDATION_FAILED",
      failureType: "validation",
      userMessage: "Something friendly",
    });

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("DocumentGenerationError");
    expect(err.retryable).toBe(false);
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.failureType).toBe("validation");
    expect(err.userMessage).toBe("Something friendly");
    expect(isDocumentGenerationError(err)).toBe(true);
  });

  it("carries structured details", () => {
    const details = { issues: [{ path: ["accusedDetails"] }] };
    const err = new DocumentGenerationError("boom", {
      code: "CASE_DATA_MISSING",
      failureType: "data",
      userMessage: "Add an accused person",
      details,
    });

    expect(err.details).toEqual(details);
  });
});

describe("getDocumentErrorMeta", () => {
  it("extracts structured metadata from DocumentGenerationError", () => {
    const err = new DocumentGenerationError("msg", {
      code: "AI_PROVIDER_OVERLOADED",
      failureType: "transient",
      userMessage: "Try again later",
    });

    expect(getDocumentErrorMeta(err)).toEqual({
      code: "AI_PROVIDER_OVERLOADED",
      failureType: "transient",
      message: "msg",
      userMessage: "Try again later",
    });
  });

  it("falls back to plain message for unknown errors", () => {
    expect(getDocumentErrorMeta(new Error("plain failure"))).toEqual({
      message: "plain failure",
      userMessage: "plain failure",
    });

    expect(getDocumentErrorMeta("oops")).toEqual({
      message: "Unknown AI generation error.",
      userMessage: "Unknown AI generation error.",
    });
  });
});

describe("formatDocumentValidationError", () => {
  it("produces friendly, actionable copy (no raw JSON) for the remand-request case", () => {
    const result = RemandRequestSchema.safeParse({
      caseDetails: {
        firNumber: "FIR-1",
        policeStation: "PS",
        investigatingOfficer: "IO",
      },
      // accusedDetails missing entirely
      groundsForRemand: ["Ground one here"],
      custodyRequested: { type: "POLICE_CUSTODY", durationDays: 14 },
      investigationProgress: "A reasonably long progress description text.",
      officerRemarks: "Remarks here",
    });

    expect(result.success).toBe(false);
    const formatted = formatDocumentValidationError(
      "REMAND_REQUEST",
      (result as { error: any }).error,
    );

    expect(formatted.message).toContain("Failed to parse or validate REMAND_REQUEST");
    expect(formatted.message).not.toContain('"origin"');
    expect(formatted.userMessage).toContain("Remand Request");
    expect(formatted.userMessage).toContain("accused");
    expect(formatted.fieldIssues["accusedDetails"]).toBeDefined();
    expect(Array.isArray(formatted.details.issues)).toBe(true);
  });

  it("groups issues by top-level field", () => {
    const result = RemandRequestSchema.safeParse({
      caseDetails: {
        firNumber: "FIR-1",
        policeStation: "PS",
        investigatingOfficer: "IO",
      },
      accusedDetails: [],
      groundsForRemand: [],
      custodyRequested: { type: "POLICE_CUSTODY", durationDays: 14 },
      investigationProgress: "A reasonably long progress description text.",
      officerRemarks: "Remarks here",
    });

    const formatted = formatDocumentValidationError(
      "REMAND_REQUEST",
      (result as { error: any }).error,
    );

    expect(formatted.fieldIssues["accusedDetails"]).toBeDefined();
    expect(formatted.fieldIssues["groundsForRemand"]).toBeDefined();
    expect(formatted.userMessage).toContain("arrested");
  });

  it("handles empty/unknown issue sets gracefully", () => {
    const formatted = formatDocumentValidationError("FIR", { issues: [] });

    expect(formatted.userMessage).toContain("First Information Report");
    expect(formatted.message).toContain("Failed to parse or validate FIR");
    expect(Object.keys(formatted.fieldIssues)).toHaveLength(0);
  });
});

describe("buildRepairPrompt", () => {
  it("includes the original prompt, previous response, and issue list", () => {
    const prompt = buildRepairPrompt(
      "ORIGINAL",
      "{\"accusedDetails\":[]}",
      [
        { path: ["accusedDetails"], message: "At least one accused is required" },
        { path: ["groundsForRemand", 0], message: "Too short" },
      ],
    );

    expect(prompt).toContain("ORIGINAL");
    expect(prompt).toContain('{"accusedDetails":[]}');
    expect(prompt).toContain("accusedDetails | At least one accused is required");
    expect(prompt).toContain("groundsForRemand.0 | Too short");
  });
});

describe("documentTypeLabel", () => {
  it("maps known types to readable labels", () => {
    expect(documentTypeLabel("REMAND_REQUEST")).toBe("Remand Request");
    expect(documentTypeLabel("FIR")).toBe("First Information Report (FIR)");
    expect(documentTypeLabel("UNKNOWN_TYPE")).toBe("document");
  });
});
