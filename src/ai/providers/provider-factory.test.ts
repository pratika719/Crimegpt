import { afterEach, describe, expect, it } from "vitest";
import { createAIProvider, resetAIProviderForTests } from "./provider-factory";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  resetAIProviderForTests();
});

describe("createAIProvider", () => {
  it("creates Groq and defaults its model", () => {
    process.env.GROQ_API_KEY = "test-key";
    expect(createAIProvider("groq")).toMatchObject({ name: "groq", model: "llama-3.3-70b-versatile" });
  });

  it("creates Gemini", () => {
    process.env.GEMINI_API_KEY = "test-key";
    expect(createAIProvider("gemini")).toMatchObject({ name: "gemini" });
  });

  it("throws a configuration error when the Groq key is missing", () => {
    delete process.env.GROQ_API_KEY;
    expect(() => createAIProvider("groq")).toThrow(expect.objectContaining({ category: "configuration_error" }));
  });
});
