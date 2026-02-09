// Scene image generation pipeline — single + batch with per-scene error isolation

import { generateImage } from "@/lib/ai/image-generation";
import { processImage, validateImage } from "@/lib/ai/image-processing";
import type {
  GenerateSceneImageInput,
  GenerateSceneImageOutput,
  BatchImageResult,
} from "@/lib/ai/types";
import { TARGET_IMAGE_WIDTH, TARGET_IMAGE_HEIGHT } from "@/lib/constants/ai";
import { createGenerationLog, updateGenerationLog } from "@/lib/db/queries/generation-logs";
import { uploadFile, getFileUrl } from "@/lib/db/storage";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { buildImagePrompt } from "@/lib/prompts/image-generation";

export async function generateSceneImage(
  input: GenerateSceneImageInput,
): Promise<GenerateSceneImageOutput> {
  // Build prompt from template
  const prompt = buildImagePrompt({
    visualDescription: input.visualDescription,
    theme: input.theme,
  });

  // Generate image via Gemini
  const imageResult = await generateImage({ prompt });

  // Decode base64 to buffer
  const imageBuffer = Buffer.from(imageResult.imageBase64, "base64");

  // Validate the generated image
  const validation = await validateImage(imageBuffer);
  if (!validation.isValid) {
    throw new AppError(
      ERROR_CODES.GENERATION_IMAGE_FAILED,
      `Generated image is invalid: ${validation.error}`,
    );
  }

  // Resize to 1080x1920 portrait (centre crop for AI images)
  const processed = await processImage({
    imageBuffer,
    targetWidth: TARGET_IMAGE_WIDTH,
    targetHeight: TARGET_IMAGE_HEIGHT,
    cropMode: "centre",
  });

  // Upload to storage
  const filename = `scene-${input.videoId}-${input.sceneNumber}.jpg`;
  const storagePath = await uploadFile(
    "images",
    input.userId,
    filename,
    processed.buffer,
    "image/jpeg",
  );

  // Get signed URL
  const storageUrl = await getFileUrl("images", input.userId, filename);

  return { storageUrl, storagePath };
}

export async function generateSceneImages(
  inputs: GenerateSceneImageInput[],
  videoId: string,
): Promise<BatchImageResult> {
  // Auto-log: create pending generation log
  const log = await createGenerationLog({
    video_id: videoId,
    stage: "images",
    status: "pending",
  });

  const startTime = Date.now();

  const results: BatchImageResult["results"] = [];
  let successCount = 0;
  let errorCount = 0;

  // Sequential with per-scene error isolation
  for (const input of inputs) {
    try {
      const output = await generateSceneImage(input);
      results.push({
        sceneNumber: input.sceneNumber,
        status: "success",
        output,
      });
      successCount++;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AppError ? error.message : "Unknown image generation error";
      results.push({
        sceneNumber: input.sceneNumber,
        status: "error",
        error: errorMessage,
      });
      errorCount++;
    }
  }

  // Auto-log: update with final status
  const durationMs = Date.now() - startTime;
  await updateGenerationLog(log.id, {
    status: errorCount === inputs.length ? "error" : "success",
    duration_ms: durationMs,
    error_message:
      errorCount > 0 ? `${errorCount}/${inputs.length} scenes failed` : null,
  });

  return { results, successCount, errorCount };
}
