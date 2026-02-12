// Database entity types for ReelZero
// Select types represent rows returned from queries.
// Insert types represent the input shape for creating new records.

// ── Users ──────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserInsert = {
  clerk_user_id: string;
  email: string;
  name: string;
};

export type UserUpdate = Partial<Pick<User, "email" | "name" | "deleted_at">>;

// ── Subscriptions ──────────────────────────────────────────────────────────────

export type Subscription = {
  id: string;
  user_id: string;
  tier: "free" | "basic" | "pro" | "enterprise";
  status: "active" | "canceled" | "past_due" | "trialing";
  credits_total: number;
  credits_used: number;
  credits_remaining: number; // computed column, read-only
  billing_cycle_start: string | null;
  billing_cycle_end: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionInsert = {
  user_id: string;
  tier: Subscription["tier"];
  status?: Subscription["status"];
  credits_total: number;
  credits_used?: number;
  billing_cycle_start?: string;
  billing_cycle_end?: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
};

export type SubscriptionUpdate = Partial<
  Pick<
    Subscription,
    | "tier"
    | "status"
    | "credits_total"
    | "credits_used"
    | "billing_cycle_start"
    | "billing_cycle_end"
    | "stripe_subscription_id"
    | "stripe_customer_id"
  >
>;

// ── Stripe Webhook Events ───────────────────────────────────────────────────────

export type StripeWebhookEvent = {
  id: string;          // Stripe evt_...
  type: string;
  processed_at: string;
};

// ── Videos ─────────────────────────────────────────────────────────────────────

export type Video = {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  duration_seconds: number | null;
  status: "processing" | "completed" | "failed";
  video_url: string | null;
  thumbnail_url: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type VideoInsert = {
  user_id: string;
  title: string;
  prompt: string;
  metadata?: Record<string, unknown>;
};

export type VideoUpdate = Partial<
  Pick<
    Video,
    | "title"
    | "status"
    | "video_url"
    | "thumbnail_url"
    | "storage_path"
    | "file_size_bytes"
    | "duration_seconds"
    | "metadata"
  >
>;

// ── Generation Logs ────────────────────────────────────────────────────────────

export type GenerationLog = {
  id: string;
  video_id: string;
  stage: "script" | "images" | "audio" | "render";
  status: "pending" | "success" | "error";
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
};

export type GenerationLogInsert = {
  video_id: string;
  stage: GenerationLog["stage"];
  status?: GenerationLog["status"];
};

export type GenerationLogUpdate = Partial<
  Pick<GenerationLog, "status" | "duration_ms" | "error_message">
>;

// ── Uploaded Images ────────────────────────────────────────────────────────────

export type UploadedImage = {
  id: string;
  user_id: string;
  video_id: string | null;
  original_filename: string;
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  created_at: string;
};

export type UploadedImageInsert = {
  user_id: string;
  video_id?: string;
  original_filename: string;
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
};

// ── Usage Tracking ─────────────────────────────────────────────────────────────

export type UsageEntry = {
  id: string;
  user_id: string;
  action: string;
  credits_used: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type UsageEntryInsert = {
  user_id: string;
  action: string;
  credits_used?: number;
  metadata?: Record<string, unknown>;
};

// ── Pagination ─────────────────────────────────────────────────────────────────

export type PaginationParams = {
  page?: number; // default: 1
  pageSize?: number; // default: 20
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

// ── Credit Operations ──────────────────────────────────────────────────────────

export type CreditCheckResult = {
  creditsRemaining: number;
  creditsTotal: number;
  creditsUsed: number;
  canGenerate: boolean;
};
