import { NextResponse } from "next/server";
import { healthService } from "@/lib/health/health.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(healthService.basic(), { status: 200 });
}