/**
 * Startup warmup — pings downstream services so they wake up before a user
 * triggers the first document generation or embedding call.
 *
 * Only runs once per process lifetime (singleton guard).
 * Fire-and-forget: never blocks boot, never throws.
 */
let warmedUp = false;

export function warmupServices(): void {
  if (warmedUp) return;
  warmedUp = true;

  const targets = [
    { name: "embedding-service", url: `${process.env.EMBEDDING_SERVICE_URL ?? ""}/health` },
    { name: "worker",            url: process.env.WORKER_HEALTH_URL ?? "" },
  ].filter((t) => Boolean(t.url));

  if (targets.length === 0) return;

  for (const { name, url } of targets) {
    fetch(url, { signal: AbortSignal.timeout(10_000) })
      .then((res) => {
        console.log(`[warmup] ${name} responded with ${res.status}`);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`[warmup] ${name} not reachable (expected on first boot): ${msg}`);
      });
  }
}
