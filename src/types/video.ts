import type { CaptionStyle, Scene } from "@/types/scene";

// Aligned with DB CHECK constraint: status IN ('processing', 'completed', 'failed')
// F008: removed 'draft' | 'generating' | 'rendering' — DB never used these values
export type VideoStatus = "processing" | "completed" | "failed";

export type VideoMetadata = {
  resolution: { width: number; height: number };
  frameRate: number;
  codec: string;
  fileSize: number | null;
};

// F009: Shape of the `metadata` JSONB column on the videos table
export type VideoDbMetadata = {
  voice?: string;
  theme?: string;
  captionStyle?: string;
  transitionType?: string;
  renderStartedAt?: string;
  audioStoragePath?: string;
  wordAlignment?: unknown[];
  scenes?: unknown[];
};

// F009: Query parameters for the video library list endpoint
export type VideoSortOrder = "newest" | "oldest";
export type VideoDateFilter = "today" | "this_week" | "this_month" | "all";

export type VideoListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: VideoSortOrder;
  dateFilter?: VideoDateFilter;
};

// F009: Usage statistics for the dashboard overview
export type UsageStats = {
  creditsRemaining: number;
  creditsTotal: number;
  creditsUsed: number;
  videosThisMonth: number;
  dailyCounts: Array<{ date: string; count: number }>;
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
