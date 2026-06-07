"use client";

import { useEffect, useRef } from "react";
import { isVideoActiveStatus } from "@/lib/utils";

type UseTaskPollingOptions<T> = {
  taskId?: string;
  status?: string;
  enabled?: boolean;
  intervalMs?: number;
  fetchStatus: (taskId: string) => Promise<T>;
  onStatus: (result: T) => void;
  onError?: (error: unknown) => void;
};

export function useTaskPolling<T>({
  taskId,
  status,
  enabled = true,
  intervalMs = 6000,
  fetchStatus,
  onStatus,
  onError,
}: UseTaskPollingOptions<T>) {
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled || !taskId || !isVideoActiveStatus(status)) return;

    let cancelled = false;

    async function tick() {
      if (!taskId || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const result = await fetchStatus(taskId);
        if (!cancelled) onStatus(result);
      } catch (error) {
        if (!cancelled) onError?.(error);
      } finally {
        inFlightRef.current = false;
      }
    }

    void tick();
    const timer = window.setInterval(tick, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, fetchStatus, intervalMs, onError, onStatus, status, taskId]);
}
