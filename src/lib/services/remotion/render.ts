/**
 * Render orchestration service.
 * F008: Builds render payloads, dispatches to renderer microservice,
 * and validates MP4 file signatures.
 */

import type { WordAlignment } from "@/lib/ai/types";
import { VIDEO_FRAME_RATE } from "@/lib/constants/video";
import type { Video } from "@/lib/db/schema";
import { getFileUrl } from "@/lib/db/storage";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { calculateSceneTimings } from "@/lib/services/remotion/sync";
import type { RenderJobPayload, RenderScene } from "@/types/render";
import type { Scene } from "@/types/scene";

const RENDERER_SERVICE_URL = process.env.RENDERER_SERVICE_URL ?? "http://localhost:3001";
const DISPATCH_TIMEOUT_MS = 8000;

/**
 * Build the render payload for a given video record.
 * Generates fresh signed Supabase URLs for all media assets (1hr expiry).
 * Calls getFileUrl which throws AppError(STORAGE_FILE_NOT_FOUND) on missing files —
 * the caller (POST /api/video/render) handles this with refundCredit + 422.
 */
export async function buildRenderPayload(
  video: Video,
  userId: string,
  wordAlignment: WordAlignment[],
  scenes: Scene[],
  audioStoragePath: string,
  showWatermark: boolean,
  callbackBaseUrl: string
): Promise<RenderJobPayload> {
  // Generate signed URL for audio
  const audioFilename = audioStoragePath.split("/").pop() ?? audioStoragePath;
  const audioUrl = await getFileUrl("audio", userId, audioFilename);

  // Calculate scene timings from audio alignment
  const renderScenes = calculateSceneTimings(scenes, wordAlignment, VIDEO_FRAME_RATE);

  // Attach fresh signed image URLs to each render scene
  const renderScenesWithUrls: RenderScene[] = await Promise.all(
    renderScenes.map(async (rs, idx) => {
      const scene = scenes[idx];
      if (!scene.imageUrl) {
        throw new AppError(
          ERROR_CODES.STORAGE_FILE_NOT_FOUND,
          `Scene ${idx + 1} has no image URL`
        );
      }
      // Extract storage path from imageUrl if it's already a path, or use as-is
      const imageFilename = scene.imageUrl.split("/").pop() ?? scene.imageUrl;
      const imageUrl = await getFileUrl("images", userId, imageFilename);
      return { ...rs, imageUrl };
    })
  );

  return {
    videoId: video.id,
    userId,
    audioUrl,
    scenes: renderScenesWithUrls,
    captionStyle: (video.metadata?.captionStyle as RenderJobPayload["captionStyle"]) ?? "none",
    transitionType: (video.metadata?.transitionType as RenderJobPayload["transitionType"]) ?? "fade",
    showWatermark,
    callbackUrl: `${callbackBaseUrl}/api/video/render/complete`,
    stageCallbackUrl: `${callbackBaseUrl}/api/video/render/stage`,
  };
}

/**
 * Dispatch the render job to the ReelZero-Renderer microservice.
 * Returns immediately with the job ID (renderer works async, calls back via webhook).
 * Throws AppError(RENDER_SERVICE_UNAVAILABLE) on network error or non-2xx response.
 */
export async function dispatchToRenderer(
  payload: RenderJobPayload
): Promise<{ jobId: string }> {
  let response: Response;

  try {
    response = await fetch(`${RENDERER_SERVICE_URL}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    });
  } catch (err) {
    throw new AppError(
      ERROR_CODES.RENDER_SERVICE_UNAVAILABLE,
      err instanceof Error ? err.message : "Network error reaching renderer"
    );
  }

  if (!response.ok) {
    throw new AppError(
      ERROR_CODES.RENDER_SERVICE_UNAVAILABLE,
      `Renderer returned ${response.status}: ${response.statusText}`
    );
  }

  const body = (await response.json()) as { jobId?: string };
  if (!body.jobId) {
    throw new AppError(
      ERROR_CODES.RENDER_SERVICE_UNAVAILABLE,
      "Renderer response missing jobId"
    );
  }

  return { jobId: body.jobId };
}

/**
 * Validate that a buffer contains a valid MP4 file.
 * Checks:
 * 1. Buffer has at least 12 bytes
 * 2. Bytes 4–7 equal ASCII "ftyp" (the MP4 box type marker)
 *
 * @param buffer - First 12+ bytes of the MP4 file
 * @returns true if valid MP4, false otherwise
 */
export function validateMp4Buffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  return buffer.subarray(4, 8).toString("ascii") === "ftyp";
}
