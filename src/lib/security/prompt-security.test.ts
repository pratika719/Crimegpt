import { describe, expect, it } from "vitest";
import { PROMPT_SECURITY_INSTRUCTIONS } from "@/lib/security/prompt-security";

describe("PROMPT_SECURITY_INSTRUCTIONS", () => {
  it("is a non-empty string", () => {
    expect(typeof PROMPT_SECURITY_INSTRUCTIONS).toBe("string");
    expect(PROMPT_SECURITY_INSTRUCTIONS.trim().length).toBeGreaterThan(0);
  });

  it("instructs the model to treat input data as untrusted", () => {
    expect(PROMPT_SECURITY_INSTRUCTIONS).toContain("untrusted");
  });

  it("instructs the model not to reveal secrets", () => {
    expect(PROMPT_SECURITY_INSTRUCTIONS).toContain("Do not reveal");
  });

  it("specifically guards against API key leakage", () => {
    expect(PROMPT_SECURITY_INSTRUCTIONS).toContain("API keys");
  });

  it("guards against instruction override injection", () => {
    expect(PROMPT_SECURITY_INSTRUCTIONS).toContain("ignore");
  });

  it("instructs the model not to fabricate facts", () => {
    expect(PROMPT_SECURITY_INSTRUCTIONS).toContain("fabricate");
  });
});
