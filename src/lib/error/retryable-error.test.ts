import { describe, expect, it } from "vitest";
import {
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

