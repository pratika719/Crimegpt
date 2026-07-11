import { NextRequest, NextResponse } from "next/server";
import { healthService } from "@/lib/health/health.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.HEALTHCHECK_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const providedSecret = request.headers.get("x-healthcheck-secret");

  return providedSecret === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        status: "failed",
        message: "Unauthorized health check request.",
      },
      { status: 401 },
    );
  }

  const response = await healthService.deep();

  return NextResponse.json(response, {
    status: response.status === "ok" ? 200 : 503,
  });
}