import type { CaptionStyle, Scene } from "@/types/scene";

export type VideoStatus =
  | "draft"
  | "generating"
  | "rendering"
  | "completed"
  | "failed";

export type VideoMetadata = {
  resolution: { width: number; height: number };
  frameRate: number;
  codec: string;
  fileSize: number | null;
};

export type Video = {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  status: VideoStatus;
  voiceId: string;
  theme: string;
  captionStyle: CaptionStyle;
  scenes: Scene[];
  metadata: VideoMetadata;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
};
