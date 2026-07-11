import { describe, expect, it } from "vitest";
import {
  isRetryableError,
  NonRetryableError,
  RetryableError,
} from "@/lib/error/retryable-error";

describe("RetryableError", () => {
  it("is an instance of Error", () => {
    expect(new RetryableError("fail")).toBeInstanceOf(Error);
  });

  it("has retryable property set to true", () => {
    expect(new RetryableError("fail").retryable).toBe(true);
  });

  it("has the correct name", () => {
    expect(new RetryableError("fail").name).toBe("RetryableError");
  });
});

describe("NonRetryableError", () => {
  it("is an instance of Error", () => {
    expect(new NonRetryableError("fail")).toBeInstanceOf(Error);
  });

  it("has retryable property set to false", () => {
    expect(new NonRetryableError("fail").retryable).toBe(false);
  });

  it("has the correct name", () => {
    expect(new NonRetryableError("fail").name).toBe("NonRetryableError");
  });
});

describe("isRetryableError", () => {
  it("returns true for RetryableError", () => {
    expect(isRetryableError(new RetryableError("Temporary failure"))).toBe(
      true,
    );
  });

  it("returns false for NonRetryableError", () => {
    expect(isRetryableError(new NonRetryableError("Invalid payload"))).toBe(
      false,
    );
  });

  it("returns true for timeout-like errors", () => {
    // isRetryableError checks for 'timeout' substring (not 'timed out')
    expect(isRetryableError(new Error("connection timeout"))).toBe(true);
  });

  it("returns true for ETIMEDOUT errors", () => {
    expect(isRetryableError(new Error("ETIMEDOUT connecting to host"))).toBe(
      true,
    );
  });

  it("returns true for rate-limit errors", () => {
    expect(isRetryableError(new Error("Rate limit exceeded"))).toBe(true);
  });

  it("returns true for ECONNRESET errors", () => {
    expect(isRetryableError(new Error("ECONNRESET by peer"))).toBe(true);
  });

  it("returns true for 503 status errors", () => {
    expect(isRetryableError(new Error("Service unavailable: 503"))).toBe(true);
  });

  it("returns true for temporarily errors", () => {
    expect(isRetryableError(new Error("Server is temporarily overloaded"))).toBe(
      true,
    );
  });

  it("returns false for validation errors", () => {
    expect(isRetryableError(new Error("Invalid document type"))).toBe(false);
  });

  it("returns false for generic errors without retryable keywords", () => {
    expect(isRetryableError(new Error("Something went wrong"))).toBe(false);
  });

  it("returns false for non-Error values (string)", () => {
    expect(isRetryableError("timeout")).toBe(false);
  });

  it("returns false for non-Error values (object)", () => {
    expect(isRetryableError({ message: "timeout" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRetryableError(null)).toBe(false);
  });
});
