"use client";
// F008: Step 6 — Video Player
// Shown after render completes. Displays the finished video with download.

import { CheckCircle2, Download, ExternalLink, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useRenderPolling } from "@/hooks/use-render-polling";
import { useVideoStore } from "@/store/video-store";
import { downloadFile } from "@/lib/utils";

export function Step6Player() {
  const { videoId, notifyGenerationComplete, reset } = useVideoStore();

  // Poll for render completion and get the video URL
  const pollResult = useRenderPolling(videoId, videoId !== null);

  // Notify store so credit display refreshes
  useEffect(() => {
    if (pollResult?.videoUrl) {
      notifyGenerationComplete();
    }
  }, [pollResult?.videoUrl, notifyGenerationComplete]);

  if (!videoId || !pollResult?.videoUrl) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading your video…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/50">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">Video ready!</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            Your video has been rendered successfully.
          </p>
        </div>
      </div>

      {/* Video player */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-[220px] overflow-hidden rounded-2xl border bg-black shadow-xl">
          {/* Use a native <video> element — the rendered MP4 has audio baked in.
              Remotion Player is not used here because it re-renders the composition
              (including <Audio src="">) which throws an Html5Audio error. */}
          <video
            src={pollResult.videoUrl}
            controls
            playsInline
            className="w-full"
            style={{ aspectRatio: "9/16", display: "block" }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1 gap-2" onClick={() => downloadFile(pollResult.videoUrl!, "video.mp4")}>
          <Download className="h-4 w-4" />
          Download MP4
        </Button>
        <Button asChild variant="outline" className="flex-1 gap-2">
          <Link href="/videos">
            <ExternalLink className="h-4 w-4" />
            My Library
          </Link>
        </Button>
      </div>

      {/* Create another */}
      <div className="flex justify-center border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={reset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Create another video
        </Button>
      </div>
    </div>
  );
}
