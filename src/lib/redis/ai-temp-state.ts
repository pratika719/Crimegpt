import { connectRedis } from "./redis";
import { redisKeys } from "@/lib/redis/redis-keys";

export type AITempStateStatus =
  | "PENDING"
  | "RUNNING"
  | "RETRIEVING_CONTEXT"
  | "GENERATING"
  | "SAVING"
  | "COMPLETED"
  | "FAILED";

export type AITempState = {
  requestId: string;
  caseId?: string;
  status: AITempStateStatus;
  progress: number;
  message: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};

export async function setAItempState(
  state: AITempState,
  ttlSeconds = 900,
): Promise<void> {
  const redis = await connectRedis();

  await redis.set(
    redisKeys.temp.aiState(state.requestId),
    JSON.stringify(state),
    "EX",
    ttlSeconds,
  );
}
export async function getAITempState(
  requestId: string,
): Promise<AITempState | null> {
  const redis = await connectRedis();

  const value = await redis.get(redisKeys.temp.aiState(requestId));

  if (!value) {
    return null;
  }

  return JSON.parse(value) as AITempState;
}

export async function clearAITempState(requestId: string): Promise<void> {
  const redis = await connectRedis();

  await redis.del(redisKeys.temp.aiState(requestId));
}