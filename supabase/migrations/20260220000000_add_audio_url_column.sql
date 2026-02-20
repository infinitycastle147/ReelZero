-- F008 (follow-up): Add audio_url as a first-class column on videos
-- Previously the ElevenLabs-generated MP3 URL was only buried in metadata.audioStoragePath.
-- This makes it a proper queryable column consistent with video_url / thumbnail_url.

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL;
