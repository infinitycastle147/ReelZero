"use client";

import { Film, MoreVertical, RefreshCw, Trash2, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { Video } from "@/lib/db/schema";

export type VideoCardMode = "grid" | "list";

type VideoCardProps = {
  video: Video;
  mode?: VideoCardMode;
  onDeleteRequest?: (videoId: string) => void;
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: Video["status"] }) {
  if (status === "completed") return null;
  if (status === "processing") {
    return (
      <Badge variant="secondary" className="text-xs">
        Processing
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-xs">
      Failed
    </Badge>
  );
}

export function VideoCard({ video, mode = "grid", onDeleteRequest }: VideoCardProps) {
  const title = video.title || video.prompt.slice(0, 80);

  if (mode === "list") {
    return (
      <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 shadow-sm">
        {/* Thumbnail */}
        <Link href={`/videos/${video.id}`} className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
          {video.thumbnail_url ? (
            <Image src={video.thumbnail_url} alt={title} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Film className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </Link>

        {/* Info */}
        <Link href={`/videos/${video.id}`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{formatDate(video.created_at)}</p>
        </Link>

        {/* Duration + status */}
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={video.status} />
          <span className="text-xs text-muted-foreground">{formatDuration(video.duration_seconds)}</span>
        </div>

        {/* Actions */}
        <VideoCardActions video={video} onDeleteRequest={onDeleteRequest} />
      </div>
    );
  }

  // Grid mode
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Thumbnail */}
      <Link href={`/videos/${video.id}`} className="relative aspect-video w-full overflow-hidden bg-muted">
        {video.thumbnail_url ? (
          <Image src={video.thumbnail_url} alt={title} fill className="object-cover transition-transform duration-200 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Film className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2">
          <StatusBadge status={video.status} />
          {video.duration_seconds && (
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
              {formatDuration(video.duration_seconds)}
            </span>
          )}
        </div>
      </Link>

      {/* Footer */}
      <div className="flex items-start justify-between gap-2 p-3">
        <Link href={`/videos/${video.id}`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(video.created_at)}</p>
        </Link>
        <VideoCardActions video={video} onDeleteRequest={onDeleteRequest} />
      </div>
    </div>
  );
}

function VideoCardActions({
  video,
  onDeleteRequest,
}: {
  video: Video;
  onDeleteRequest?: (videoId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Video actions"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-md border bg-popover p-1 shadow-md">
            <Link
              href={`/videos/${video.id}`}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Link>
            {video.status === "failed" && (
              <Link
                href={`/create?regenerateFrom=${video.id}`}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </Link>
            )}
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => {
                setOpen(false);
                onDeleteRequest?.(video.id);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
