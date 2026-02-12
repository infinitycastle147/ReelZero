import type { VideoStatus } from "@/types/video";

export type DbUser = {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DbSubscription = {
  id: string;
  userId: string;
  tier: "free" | "basic" | "pro" | "enterprise";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  creditsUsed: number;
  creditsTotal: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  status: "active" | "canceled" | "past_due" | "trialing";
  createdAt: string;
  updatedAt: string;
};

export type DbVideo = {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  status: VideoStatus;
  metadata: Record<string, unknown>;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
};

export type DbGenerationLog = {
  id: string;
  userId: string;
  videoId: string | null;
  action: string;
  provider: string;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
  status: "success" | "failed";
  errorDetails: string | null;
  createdAt: string;
};
