// Image processing — Sharp resize (1080x1920, fit:cover) + validation

import sharp from "sharp";

import type {
  ProcessImageInput,
  ProcessImageOutput,
  ValidateImageResult,
} from "@/lib/ai/types";

export async function processImage(input: ProcessImageInput): Promise<ProcessImageOutput> {
  const processed = await sharp(input.imageBuffer)
    .resize(input.targetWidth, input.targetHeight, {
      fit: "cover",
      position: input.cropMode,
    })
    .jpeg({ quality: 90 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: processed.data,
    width: processed.info.width,
    height: processed.info.height,
    format: processed.info.format,
    sizeBytes: processed.info.size,
  };
}

export async function validateImage(imageBuffer: Buffer): Promise<ValidateImageResult> {
  try {
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.format) {
      return { isValid: false, error: "Unable to determine image format" };
    }

    if (!metadata.width || !metadata.height) {
      return { isValid: false, error: "Unable to determine image dimensions" };
    }

    if (metadata.width === 0 || metadata.height === 0) {
      return { isValid: false, error: "Image has zero dimensions" };
    }

    return {
      isValid: true,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch {
    return { isValid: false, error: "Image file is corrupted or unreadable" };
  }
}
