"use client";

// Calls POST /api/video/render/retry to re-dispatch a failed video to the renderer
// without regenerating audio or images. Redirects to the same page on success
// so the processing poller kicks in.

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";

type Props = {
  videoId: string;
};

export function VideoRetryButton({ videoId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/video/render/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      const json = (await res.json()) as {
        data?: { status: string };
        error?: { message: string };
      };

      if (!res.ok) {
        setError(json.error?.message ?? "Retry failed. Please try again.");
        return;
      }

      // Refresh the page — the processing state + poller will kick in automatically
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="default"
        size="sm"
        onClick={handleRetry}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="mr-1.5 h-4 w-4" />
        )}
        {loading ? "Retrying…" : "Retry Render"}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
