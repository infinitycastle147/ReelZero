import fs from "fs/promises";
import path from "path";

const OUTPUT_DIR = process.env.REMOTION_OUTPUT_DIR ?? "/tmp/renders";

/**
 * Download a file from a URL to a local destination path.
 * Retries with exponential backoff on failure.
 */
export async function downloadFile(
  url: string,
  destPath: string,
  maxRetries = 3,
): Promise<void> {
  let lastError: Error | undefined;
  const delays = [500, 1000, 2000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} ${response.statusText} from ${url}`,
        );
      }
      const buffer = await response.arrayBuffer();
      await fs.writeFile(destPath, Buffer.from(buffer));
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = delays[attempt] ?? 2000;
        console.warn(
          `[assets] Download attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`,
        );
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `[assets] downloadFile failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
  );
}

/**
 * Create the per-job temp directory and return its path.
 * Path: {REMOTION_OUTPUT_DIR}/{jobId}/
 */
export async function ensureJobDir(jobId: string): Promise<string> {
  const jobDir = path.join(OUTPUT_DIR, jobId);
  await fs.mkdir(jobDir, { recursive: true });
  return jobDir;
}

/**
 * Delete the per-job temp directory and all its contents.
 * Silently ignores errors (e.g. directory already deleted).
 */
export async function cleanupJobDir(jobId: string): Promise<void> {
  const jobDir = path.join(OUTPUT_DIR, jobId);
  try {
    await fs.rm(jobDir, { recursive: true, force: true });
    console.log(`[assets] Cleaned up job dir: ${jobDir}`);
  } catch (err) {
    console.warn(`[assets] Failed to clean up job dir ${jobDir}:`, err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
