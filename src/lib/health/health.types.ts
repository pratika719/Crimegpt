export type HealthStatus = "ok" | "degraded" | "failed";

export type HealthCheckResult = {
  status: HealthStatus;
  message: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
};

export type HealthResponse = {
  status: HealthStatus;
  service: string;
  environment: string;
  timestamp: string;
  checks: Record<string, HealthCheckResult>;
};
