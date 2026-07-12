import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Warmup endpoint — called periodically by the client-side keep-alive.
 * Forwards pings to worker + embedding services so they don't spin down.
 */
export async function GET() {
  const results: Record<string, string> = {};
  const targets = [
    { name: "embedding", url: `${process.env.EMBEDDING_SERVICE_URL ?? ""}/health` },
    { name: "worker",    url: process.env.WORKER_HEALTH_URL ?? "" },
  ].filter((t) => Boolean(t.url));

  await Promise.all(
    targets.map(async ({ name, url }) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
        results[name] = `ok (${res.status})`;
      } catch {
        results[name] = "unreachable";
      }
    }),
  );

  return NextResponse.json({
    status: "ok",
    targets: results,
    timestamp: new Date().toISOString(),
  });
}
