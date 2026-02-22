-- Set a generous file size limit on the videos bucket.
-- Default Supabase free-tier limit is 50 MB, which is too small for rendered MP4s.
-- With CRF 23 + yuv420p a 60-second 1080×1920 reel is ~8–20 MB, but we allow 200 MB
-- as headroom for longer videos and higher-quality settings in future tiers.
-- 200 MB = 200 * 1024 * 1024 = 209715200 bytes

UPDATE storage.buckets
SET file_size_limit = 209715200   -- 200 MB in bytes
WHERE id = 'videos';
