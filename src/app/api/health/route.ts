import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { connectRedis } from "@/lib/redis";

export async function GET() {
  let databaseStatus = "disconnected";
  let redisStatus = "disconnected";
  let status = 200;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = "connected";
  } catch (dbError) {
    console.error("Database health check failed:", dbError);
    status = 500;
  }

  try {
    const redis = await connectRedis();
    await redis.ping();
    redisStatus = "connected";
  } catch (redisError) {
    console.error("Redis health check failed:", redisError);
    status = 500;
  }

  return NextResponse.json(
    {
      success: status === 200,
      database: databaseStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    },
    {
      status,
    }
  );
}