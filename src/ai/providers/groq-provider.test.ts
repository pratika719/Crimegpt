import { afterEach, describe, expect, it, vi } from "vitest";
import { GroqLlamaProvider } from "./groq-provider";

afterEach(() => vi.unstubAllGlobals());

describe("GroqLlamaProvider", () => {
  it.each([
    [429, "rate_limit_error", true],
    [500, "provider_unavailable", true],
    [503, "provider_unavailable", true],
    [401, "provider_auth_error", false],
  ])("classifies HTTP %s safely", async (status, category, retryable) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("provider body must not leak", { status })));
    const groq = new GroqLlamaProvider({ apiKey: "test-key" });

    await expect(groq.generateText({ userPrompt: "test" })).rejects.toMatchObject({
      category,
      retryable,
      provider: "groq",
    });
  });

  it("treats an exhausted 429 quota as non-retryable on Groq", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { message: "Requests per day quota exhausted" } }),
      { status: 429 },
    )));
    const groq = new GroqLlamaProvider({ apiKey: "test-key" });

    await expect(groq.generateText({ userPrompt: "test" })).rejects.toMatchObject({
      category: "quota_error",
      retryable: false,
    });
  });

  it("classifies aborted requests as provider timeouts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(
      new DOMException("The operation was aborted", "AbortError"),
    ));
    const groq = new GroqLlamaProvider({ apiKey: "test-key" });

    await expect(groq.generateText({ userPrompt: "test" })).rejects.toMatchObject({
      category: "provider_timeout",
      retryable: true,
      userMessage: "AI generation timed out. Please try again.",
    });
  });

  it("returns consistent parsed JSON metadata and usage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "```json\n{\"ok\":true}\n```" } }],
      usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
    }), { status: 200, headers: { "content-type": "application/json" } })));
    const groq = new GroqLlamaProvider({ apiKey: "test-key", model: "llama-test" });

    const result = await groq.generateJSON<{ ok: boolean }>({ userPrompt: "test" });

    expect(result).toMatchObject({ data: { ok: true }, provider: "groq", model: "llama-test", fallbackUsed: false, usage: { totalTokens: 14 } });
  });
});
