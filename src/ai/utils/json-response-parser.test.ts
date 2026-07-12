import { describe, expect, it } from "vitest";
import { extractJSONFromLLMResponse } from "./json-response-parser";
import { InvalidAIResponseError } from "@/lib/error/ai-provider-error";

describe("extractJSONFromLLMResponse", () => {
  it("parses plain JSON", () => {
    expect(extractJSONFromLLMResponse<{ ok: boolean }>(' {"ok":true} ')).toEqual({ ok: true });
  });

  it("parses json and generic markdown fences", () => {
    expect(extractJSONFromLLMResponse("```json\n{\"value\":1}\n```")).toEqual({ value: 1 });
    expect(extractJSONFromLLMResponse("```\n[1,2]\n```")).toEqual([1, 2]);
  });

  it("isolates the first complete JSON value without being confused by braces in strings", () => {
    expect(extractJSONFromLLMResponse('Result: {"text":"a } brace","items":[1]} done')).toEqual({
      text: "a } brace",
      items: [1],
    });
  });

  it("throws a safe domain error for malformed output", () => {
    expect(() => extractJSONFromLLMResponse("not json {oops"))
      .toThrow(InvalidAIResponseError);
  });
});
