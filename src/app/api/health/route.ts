import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        success: true,
        database: "connected",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
      }
    );
  }
}