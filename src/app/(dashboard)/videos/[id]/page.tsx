// F009: T021 — Video detail page.
// T023: Remotion Player wiring (via native <video> tag with signed URL for MP4 playback).
// T024: Download button via <a href={signedUrl} download> in VideoDetailActions.
// T027: Delete dialog wired via VideoDetailActions client component.
// T032: Processing video polling via VideoDetailPoller client component.

import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VideoDetailActions } from "@/components/video/video-detail-actions";
import { VideoDetailMetadata } from "@/components/video/video-detail-metadata";
import { VideoDetailPoller } from "@/components/video/video-detail-poller";
import { VideoRetryButton } from "@/components/video/video-retry-button";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { getVideoById } from "@/lib/db/queries/videos";
import { getFileUrl } from "@/lib/db/storage";

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    redirect("/sign-in");
  }

  const { id } = await params;

  const video = await getVideoById(id);
  if (!video || video.user_id !== dbUser.id) {
    notFound();
  }

  // Sign the video URL for playback (completed videos only)
  let signedVideoUrl: string | null = null;
  if (video.status === "completed") {
    if (video.storage_path) {
      // Preferred: generate a fresh signed URL from the known storage path
      const parts = video.storage_path.split("/");
      const filename = parts.slice(1).join("/");
      const uidPart = parts[0] ?? dbUser.id;
      signedVideoUrl = await getFileUrl("videos", uidPart, filename);
    } else if (video.video_url) {
      // Fallback for older videos where storage_path wasn't stored: use video_url directly.
      // This may be an expired signed URL — but it's better than showing a failure message.
      signedVideoUrl = video.video_url;
    }
  }

  const title = video.title || video.prompt.slice(0, 80);

  // Determine if this failed video has enough saved metadata to do a render-only retry
  // (i.e. the original run completed audio + scene generation but failed at upload/render)
  const metadata = video.metadata as {
    audioStoragePath?: string;
    wordAlignment?: unknown[];
    scenes?: unknown[];
  };
  const canRetryRender =
    video.status === "failed" &&
    !!metadata.audioStoragePath &&
    Array.isArray(metadata.wordAlignment) && metadata.wordAlignment.length > 0 &&
    Array.isArray(metadata.scenes) && metadata.scenes.length > 0;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/videos">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            My Videos
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          <div className="flex items-center gap-2">
            {video.status === "processing" && (
              <Badge variant="secondary">Processing</Badge>
            )}
            {video.status === "failed" && (
              <Badge variant="destructive">Failed</Badge>
            )}
            {video.status === "completed" && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Completed
              </Badge>
            )}
          </div>
        </div>

        {/* T024 + T027: Download + Delete buttons (Client Component for dialog state) */}
        <VideoDetailActions
          videoId={video.id}
          title={title}
          status={video.status}
          signedVideoUrl={signedVideoUrl}
        />
      </div>

      {/* Video player — T023: native <video> tag plays the rendered MP4 */}
      {video.status === "completed" && signedVideoUrl ? (
        <div className="overflow-hidden rounded-xl border bg-black">
          <video
            src={signedVideoUrl}
            controls
            playsInline
            preload="metadata"
            className="mx-auto max-h-[480px] w-full"
            poster={video.thumbnail_url ?? undefined}
          />
        </div>
      ) : video.status === "processing" ? (
        <>
          {/* T032: Poll render status every 5s and refresh when done */}
          <VideoDetailPoller videoId={video.id} />
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-medium">Your video is being generated…</p>
            <p className="text-xs text-muted-foreground">
              This usually takes 1–3 minutes. The page will update automatically.
            </p>
          </div>
        </>
      ) : (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 text-center">
          <p className="text-sm font-medium text-destructive">Video generation failed</p>
          <p className="text-xs text-muted-foreground">
            {canRetryRender
              ? "Rendering failed but your audio and scenes are saved. You can retry the render without regenerating anything."
              : "Something went wrong during generation."}
          </p>
          <div className="flex gap-2">
            {canRetryRender && (
              <VideoRetryButton videoId={video.id} />
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/create?regenerateFrom=${video.id}`}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Start Over
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Details</h2>
        <VideoDetailMetadata video={video} />
      </div>
    </div>
  );
}
