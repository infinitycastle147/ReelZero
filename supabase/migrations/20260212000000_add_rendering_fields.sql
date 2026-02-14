-- F008: Add rendering fields to videos table
-- Adds current_stage for tracking render pipeline progress
-- and a composite index to support the concurrent-render guard query

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS current_stage TEXT
    CHECK (current_stage IN ('audio', 'sync', 'render', 'finalize'))
    DEFAULT NULL;

-- Index for the concurrent-render guard query: getProcessingVideoByUserId
CREATE INDEX IF NOT EXISTS idx_videos_user_status
  ON videos(user_id, status);
