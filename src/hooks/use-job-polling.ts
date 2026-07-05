"use client";

import { useEffect, useRef, useState } from "react";
import { getJobStatusAction } from "@/actions/job-status.actions";
import type { MinimalJobStatusResponse } from "@/services/queue/job-status.service";

type UseJobPollingInput = {
  jobId: string | null;
  queueName: string | null;
  enabled: boolean;
  intervalMs?: number;
};

export function useJobPolling({
  jobId,
  queueName,
  enabled,
  intervalMs = 5000,
}: UseJobPollingInput) {
  const [status, setStatus] = useState<MinimalJobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !jobId || !queueName) {
      setStatus(null);
      setError(null);
      setIsPolling(false);
      return;
    }

    stoppedRef.current = false;
    setIsPolling(true);
    setError(null);

    async function poll() {
      if (stoppedRef.current) {
        return;
      }

      try {
        const response = await getJobStatusAction({
          jobId,
          queueName,
        });

        if (stoppedRef.current) {
          return;
        }

        if (!response.success) {
          setError(response.message ?? "Failed to check job status.");
          setIsPolling(false);
          return;
        }

        const jobStatus = response.data;
        setStatus(jobStatus);

        const state = jobStatus.state;

        if (state === "completed" || state === "failed" || state === "unknown") {
          setIsPolling(false);
          return;
        }

        window.setTimeout(poll, intervalMs);
      } catch {
        if (stoppedRef.current) {
          return;
        }
        setError("An unexpected error occurred while checking job status.");
        setIsPolling(false);
      }
    }

    void poll();

    return () => {
      stoppedRef.current = true;
      setIsPolling(false);
    };
  }, [enabled, jobId, queueName, intervalMs]);

  return {
    status,
    error,
    isPolling,
  };
}
