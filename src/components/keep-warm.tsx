"use client";

import { useEffect } from "react";

/**
 * Keep-alive component — pings worker + embedding service every 5 minutes
 * while the browser tab is visible. Prevents Render from spinning them down.
 *
 * Invisible — renders nothing.
 */
export function KeepWarm() {
  useEffect(() => {
    // Use a global flag so multiple browser tabs don't all ping simultaneously
    if ((window as any).__keepWarmActive) return;
    (window as any).__keepWarmActive = true;

    const ping = () => {
      if (document.hidden) return; // skip if tab is in background
      fetch("/api/warmup", { signal: AbortSignal.timeout(10_000) }).catch(() => {
        // Ignore — best-effort
      });
    };

    // Ping immediately, then every 5 minutes
    ping();
    const interval = setInterval(ping, 5 * 60 * 1000);

    // Also ping when tab becomes visible again (user returns after idle)
    const onVisibility = () => {
      if (!document.hidden) ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      (window as any).__keepWarmActive = false;
    };
  }, []);

  return null;
}
