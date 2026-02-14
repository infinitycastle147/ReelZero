import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_KEY ?? "",
);

const VIDEOS_BUCKET = "videos";
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Upload a rendered MP4 to Supabase Storage and return a 1-hour signed URL.
 * Upload path: videos/{userId}/{videoId}.mp4
 * Uses upsert: true to overwrite any previous render for the same video.
 */
export async function uploadMp4(
  userId: string,
  videoId: string,
  filePath: string,
): Promise<string> {
  const storagePath = `${userId}/${videoId}.mp4`;
  const fileBuffer = await fs.readFile(filePath);

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error: uploadError } = await supabase.storage
        .from(VIDEOS_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Supabase upload error: ${uploadError.message}`);
      }

      const { data: signedData, error: signError } = await supabase.storage
        .from(VIDEOS_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

      if (signError || !signedData?.signedUrl) {
        throw new Error(
          `Failed to create signed URL: ${signError?.message ?? "no URL returned"}`,
        );
      }

      console.log(`[storage] Uploaded MP4 to ${VIDEOS_BUCKET}/${storagePath}`);
      return signedData.signedUrl;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[storage] Upload attempt ${attempt} failed: ${lastError.message}`,
      );
      if (attempt < 3) {
        await sleep(1000 * attempt);
      }
    }
  }

  throw new Error(
    `[storage] uploadMp4 failed after 3 attempts: ${lastError?.message}`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
