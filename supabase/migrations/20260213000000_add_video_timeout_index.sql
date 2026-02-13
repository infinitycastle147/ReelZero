-- F009: Partial index to speed up check-on-read timeout query
-- Used by listVideosFiltered() to UPDATE stale processing videos
-- before SELECT. Scoped to status='processing' rows only.
CREATE INDEX IF NOT EXISTS idx_videos_processing_render_started
  ON videos ((metadata->>'renderStartedAt'))
  WHERE status = 'processing';
