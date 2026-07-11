import { describe, expect, it } from "vitest";
import { getOverallStatus } from "@/lib/health/health.service";
import type { HealthCheckResult } from "@/lib/health/health.types";

const ok: HealthCheckResult = { status: "ok", message: "ok" };
const degraded: HealthCheckResult = { status: "degraded", message: "slow" };
const failed: HealthCheckResult = { status: "failed", message: "down" };

describe("getOverallStatus", () => {
  it("returns 'ok' when all checks are ok", () => {
    expect(getOverallStatus({ database: ok, redis: ok, fastapi: ok })).toBe(
      "ok",
    );
  });

  it("returns 'ok' for a single ok check", () => {
    expect(getOverallStatus({ app: ok })).toBe("ok");
  });

  it("returns 'degraded' when one check is degraded and rest are ok", () => {
    expect(
      getOverallStatus({ database: ok, fastapi: degraded }),
    ).toBe("degraded");
  });

  it("returns 'failed' when one check has failed", () => {
    expect(getOverallStatus({ database: ok, redis: failed })).toBe("failed");
  });

  it("returns 'failed' when one check failed even if others are only degraded", () => {
    expect(
      getOverallStatus({ database: degraded, redis: failed, fastapi: ok }),
    ).toBe("failed");
  });

  it("returns 'failed' for a single failed check", () => {
    expect(getOverallStatus({ db: failed })).toBe("failed");
  });

  it("returns 'ok' for an empty checks object", () => {
    // No checks → no failures or degradations → ok
    expect(getOverallStatus({})).toBe("ok");
  });
});
