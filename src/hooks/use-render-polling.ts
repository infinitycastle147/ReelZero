"use client";
// F008: Hook that polls GET /api/video/render/status every 3s.
// Stops automatically when status is terminal (completed | failed) or on unmount.

import { useEffect, useRef, useState } from "react";

import { useVideoStore } from "@/store/video-store";
import type { RenderStatusResponse } from "@/types/render";

const POLL_INTERVAL_MS = 3000;

export function useRenderPolling(
  videoId: string | null,
  enabled: boolean
): RenderStatusResponse | null {
  const [status, setStatus] = useState<RenderStatusResponse | null>(null);
  const { setRenderStatus, setRenderError } = useVideoStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !videoId) return;

    async function poll() {
      if (!videoId) return;
      try {
        const res = await fetch(`/api/video/render/status?videoId=${encodeURIComponent(videoId)}`);
        if (!res.ok) return;

        const json = (await res.json()) as { data: RenderStatusResponse };
        const data = json.data;

        setStatus(data);
        setRenderStatus(data.currentStage);
        if (data.error) setRenderError(data.error);

        // Stop polling when terminal
        if (data.status === "completed" || data.status === "failed") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // Network error — keep polling
      }
    }

    // Poll immediately, then every POLL_INTERVAL_MS
    void poll();
    intervalRef.current = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [videoId, enabled, setRenderStatus, setRenderError]);

  return status;
}
