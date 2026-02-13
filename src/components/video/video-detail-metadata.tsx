// F009: T022 — Video detail metadata display component.
// Displays all available metadata fields for a completed/failed video.
// Display only — no interactivity.

import type { Video } from "@/lib/db/schema";
import type { VideoDbMetadata } from "@/types/video";

type VideoDetailMetadataProps = {
  video: Video;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="min-w-[140px] text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value || "—"}</dd>
    </div>
  );
}

const THEME_LABELS: Record<string, string> = {
  realistic: "Realistic",
  anime: "Anime",
  artistic: "Artistic",
  cinematic: "Cinematic",
  minimalist: "Minimalist",
};

const CAPTION_LABELS: Record<string, string> = {
  "word-by-word": "Word-by-Word",
  "full-sentence": "Full Sentence",
  none: "None",
};

const TRANSITION_LABELS: Record<string, string> = {
  fade: "Fade",
  crossfade: "Crossfade",
};

export function VideoDetailMetadata({ video }: VideoDetailMetadataProps) {
  const meta = video.metadata as VideoDbMetadata;

  return (
    <dl className="space-y-3 rounded-xl border bg-card p-4">
      <MetaRow label="Prompt" value={video.prompt} />
      {meta.voice && <MetaRow label="Voice" value={meta.voice} />}
      {meta.theme && <MetaRow label="Visual Theme" value={THEME_LABELS[meta.theme] ?? meta.theme} />}
      {meta.captionStyle && (
        <MetaRow label="Caption Style" value={CAPTION_LABELS[meta.captionStyle] ?? meta.captionStyle} />
      )}
      {meta.transitionType && (
        <MetaRow label="Transition" value={TRANSITION_LABELS[meta.transitionType] ?? meta.transitionType} />
      )}
      <MetaRow label="Duration" value={formatDuration(video.duration_seconds)} />
      <MetaRow label="File Size" value={formatFileSize(video.file_size_bytes)} />
      <MetaRow label="Created" value={formatDate(video.created_at)} />
    </dl>
  );
}
