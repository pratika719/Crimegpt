import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "@/lib/security/rate-limit";

// Mock the Redis module that rate-limit.ts imports via @/lib/redis
const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
};

vi.mock("@/lib/redis", () => ({
  connectRedis: vi.fn(async () => mockRedis),
}));

describe("checkRateLimit", () => {
  beforeEach(() => {
    mockRedis.incr.mockReset();
    mockRedis.expire.mockReset();
    mockRedis.ttl.mockReset();
  });

  it("allows request under limit and sets expiry on first increment", async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(60);

    const result = await checkRateLimit({
      key: "rate-limit:test:user_1",
      limit: 3,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
    expect(result.remaining).toBe(2);
    // expire must be called for count === 1 (first request in window)
    expect(mockRedis.expire).toHaveBeenCalledWith(
      "rate-limit:test:user_1",
      60,
    );
  });

  it("allows request at exact limit", async () => {
    mockRedis.incr.mockResolvedValue(3);
    mockRedis.ttl.mockResolvedValue(45);

    const result = await checkRateLimit({
      key: "rate-limit:test:user_1",
      limit: 3,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("blocks request one over limit", async () => {
    mockRedis.incr.mockResolvedValue(4);
    mockRedis.ttl.mockResolvedValue(30);

    const result = await checkRateLimit({
      key: "rate-limit:test:user_1",
      limit: 3,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetInSeconds).toBe(30);
    // expire must NOT be called again on subsequent increments
    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it("uses windowSeconds as resetInSeconds when TTL is not set (-1)", async () => {
    mockRedis.incr.mockResolvedValue(2);
    mockRedis.ttl.mockResolvedValue(-1);

    const result = await checkRateLimit({
      key: "rate-limit:test:user_1",
      limit: 5,
      windowSeconds: 120,
    });

    expect(result.resetInSeconds).toBe(120);
  });

  it("returns correct limit value in result", async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(60);

    const result = await checkRateLimit({
      key: "rate-limit:test:user_1",
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.limit).toBe(10);
  });
});
