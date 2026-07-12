"use client";

import { useEffect, useRef, useState } from "react";
import { getJobStatusAction } from "@/actions/job-status.actions";
import type { MinimalJobStatusResponse } from "@/services/queue/job-status.service";

type UseJobPollingInput = {
  jobId: string | null;
  queueName: string | null;
  enabled: boolean;
  intervalMs?: number;
  /**
   * Maximum time (ms) to keep polling before timing out.
   * Default 90_000 (90 seconds) — document generation should complete within this window.
   */
  maxPollingMs?: number;
  /**
   * If the job stays in "waiting" state longer than this (ms),
   * we assume the worker is unavailable and surface an error early.
   * Default 15_000 (15 seconds / ~3 poll cycles).
   */
  waitingStallMs?: number;
};

/**
 * Polls a BullMQ job's status until it reaches a terminal state
 * (completed / failed / unknown).
 *
 * Worker-down detection:
 *   If the job sits in "waiting" for longer than `waitingStallMs` (default 15s),
 *   we assume no worker is available and surface an error immediately
 *   instead of waiting for maxPollingMs.
 *
 * On timeout or terminal failure, sets the `error` string and stops polling,
 * allowing the consumer to display the error and clean up loading state.
 */
export function useJobPolling({
  jobId,
  queueName,
  enabled,
  intervalMs = 5000,
  maxPollingMs = 90_000,
  waitingStallMs = 15_000,
}: UseJobPollingInput) {
  const [status, setStatus] = useState<MinimalJobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Refs to avoid stale closures in setTimeout
  const stoppedRef = useRef(false);
  const startedAtRef = useRef(0);
  const waitingSinceRef = useRef(0);
  const intervalRef = useRef(intervalMs);
  const maxPollingRef = useRef(maxPollingMs);
  const waitingStallRef = useRef(waitingStallMs);

  // Keep config refs in sync without restarting the effect
  intervalRef.current = intervalMs;
  maxPollingRef.current = maxPollingMs;
  waitingStallRef.current = waitingStallMs;

  useEffect(() => {
    if (!enabled || !jobId || !queueName) {
      setStatus(null);
      setError(null);
      setIsPolling(false);
      return;
    }

    stoppedRef.current = false;
    startedAtRef.current = Date.now();
    waitingSinceRef.current = 0;
    setIsPolling(true);
    setError(null);

    async function poll() {
      if (stoppedRef.current) return;

      const elapsed = Date.now() - startedAtRef.current;
      const maxMs = maxPollingRef.current;

      // Hard timeout: job hasn't completed within maxPollingMs
      if (elapsed > maxMs) {
        if (!stoppedRef.current) {
          setError(
            `Generation timed out after ${Math.round(elapsed / 1000)} seconds. ` +
              "The worker may be unavailable. Please try again.",
          );
          setIsPolling(false);
        }
        return;
      }

      try {
        const response = await getJobStatusAction({
          jobId,
          queueName,
        });

        if (stoppedRef.current) return;

        if (!response.success) {
          setError(response.message ?? "Failed to check job status.");
          setIsPolling(false);
          return;
        }

        const jobStatus = response.data;
        setStatus(jobStatus);

        const state = jobStatus.state;

        // Terminal states — stop polling; the component handles via `status`
        if (state === "completed" || state === "failed" || state === "unknown") {
          setIsPolling(false);
          return;
        }

        // Track how long the job has been "waiting" (queued but no worker has picked it up)
        if (state === "waiting") {
          if (waitingSinceRef.current === 0) {
            waitingSinceRef.current = Date.now();
          } else {
            const waitingElapsed = Date.now() - waitingSinceRef.current;
            if (waitingElapsed > waitingStallRef.current) {
              setError(
                "Document generation is stuck in queue — the background worker may be unavailable. " +
                  "Please try again or check the service status.",
              );
              setIsPolling(false);
              return;
            }
          }
        } else {
          // Job has left "waiting" (now "active" or "delayed") — reset the counter
          waitingSinceRef.current = 0;
        }

        // Non-terminal state — continue polling
        window.setTimeout(poll, intervalRef.current);
      } catch {
        if (stoppedRef.current) return;
        setError("An unexpected error occurred while checking job status.");
        setIsPolling(false);
      }
    }

    void poll();

    return () => {
      stoppedRef.current = true;
      setIsPolling(false);
    };
  }, [enabled, jobId, queueName]);

  return {
    status,
    error,
    isPolling,
  };
}
