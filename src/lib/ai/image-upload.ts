// User image upload — validate, resize, store, create DB record

import { processImage, validateImage } from "@/lib/ai/image-processing";
import type { UploadImageInput, UploadImageOutput } from "@/lib/ai/types";
import {
  MAX_UPLOAD_SIZE_BYTES,
  ALLOWED_UPLOAD_MIME_TYPES,
  TARGET_IMAGE_WIDTH,
  TARGET_IMAGE_HEIGHT,
} from "@/lib/constants/ai";
import { createUploadedImage } from "@/lib/db/queries/uploaded-images";
import { uploadFile, getFileUrl } from "@/lib/db/storage";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

export async function uploadUserImage(input: UploadImageInput): Promise<UploadImageOutput> {
  // Validate file size
  if (input.file.length > MAX_UPLOAD_SIZE_BYTES) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `File size exceeds ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB limit`,
    );
  }

  // Validate MIME type
  if (
    !(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(input.mimeType)
  ) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `File type ${input.mimeType} is not allowed. Accepted types: ${ALLOWED_UPLOAD_MIME_TYPES.join(", ")}`,
    );
  }

  // Validate image integrity via Sharp
  const validation = await validateImage(input.file);
  if (!validation.isValid) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `Image validation failed: ${validation.error}`,
    );
  }

  // Resize to 1080x1920 with attention crop (for user uploads)
  const processed = await processImage({
    imageBuffer: input.file,
    targetWidth: TARGET_IMAGE_WIDTH,
    targetHeight: TARGET_IMAGE_HEIGHT,
    cropMode: "attention",
  });

  // Generate filename with timestamp to avoid collisions
  const timestamp = Date.now();
  const extension = input.mimeType.split("/")[1] === "jpeg" ? "jpg" : input.mimeType.split("/")[1];
  const filename = `upload-${timestamp}.${extension}`;

  // Upload to storage
  const storagePath = await uploadFile(
    "images",
    input.userId,
    filename,
    processed.buffer,
    "image/jpeg",
  );

  // Get signed URL
  const storageUrl = await getFileUrl("images", input.userId, filename);

  // Create DB record
  await createUploadedImage({
    user_id: input.userId,
    video_id: input.videoId,
    original_filename: input.originalFilename,
    storage_path: storagePath,
    file_size_bytes: processed.sizeBytes,
    mime_type: "image/jpeg",
  });

  return {
    storageUrl,
    storagePath,
    fileSizeBytes: processed.sizeBytes,
  };
}
