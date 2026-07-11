import { NextResponse } from "next/server";
import { healthService } from "@/lib/health/health.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const response = await healthService.ready();

  return NextResponse.json(response, {
    status: response.status === "ok" ? 200 : 503,
  });
}
