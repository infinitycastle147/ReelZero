import fs from "fs";
import fsPromises from "fs/promises";
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
 *
 * Reads via ReadStream → Buffer to avoid a second full-file read and logs
 * the file size so upload failures are immediately diagnosable.
 */
export async function uploadMp4(
  userId: string,
  videoId: string,
  filePath: string,
): Promise<string> {
  const storagePath = `${userId}/${videoId}.mp4`;

  // Stat first so we can log the size and detect 0-byte renders early
  const { size } = await fsPromises.stat(filePath);
  if (size === 0) {
    throw new Error("Rendered MP4 is 0 bytes — render likely failed silently");
  }
  console.log(
    `[storage] Preparing upload: ${VIDEOS_BUCKET}/${storagePath} (${(size / 1_048_576).toFixed(1)} MB)`,
  );

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Stream the file into a buffer — avoids a second stat + read call
      // while keeping the upload as a single Blob for Supabase JS v2 compatibility
      const fileBuffer = await streamToBuffer(fs.createReadStream(filePath));

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

/** Collect a readable stream into a single Buffer */
function streamToBuffer(stream: fs.ReadStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
