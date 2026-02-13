"use client";
// F009: T032 — Polls render status for processing videos on the detail page.
// Calls router.refresh() when status transitions to completed or failed,
// causing the Server Component to re-fetch and update the UI.

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 5000;

type RenderStatusData = {
  status: "processing" | "completed" | "failed";
};

type VideoDetailPollerProps = {
  videoId: string;
};

export function VideoDetailPoller({ videoId }: VideoDetailPollerProps) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/video/render/status?videoId=${encodeURIComponent(videoId)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { data: RenderStatusData };
        const status = json.data?.status;
        if (status === "completed" || status === "failed") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          router.refresh();
        }
      } catch {
        // Network error — keep polling
      }
    }

    void poll();
    intervalRef.current = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Renders nothing — side-effect only
  return null;
}
