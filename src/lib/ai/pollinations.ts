// Pollinations.ai image generation — free MVP fallback
// Endpoint: gen.pollinations.ai (requires API key via bearer auth)
// Model: flux (Flux Schnell)
// Remove this file + revert scene-image-generation.ts when switching to a production provider

import { AI_CONFIG } from "@/lib/ai/config";
import type { ImageGenerationOutput } from "@/lib/ai/types";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

export async function generateImageWithPollinations(input: {
  prompt: string;
  negativePrompt: string;
}): Promise<ImageGenerationOutput> {
  const { baseUrl, model, apiKey } = AI_CONFIG.pollinations;
  const seed = Math.floor(Math.random() * 1_000_000);

  const url =
    `${baseUrl}/image/${encodeURIComponent(input.prompt)}` +
    `?width=1080&height=1920&model=${model}&nologo=true&seed=${seed}` +
    `&negative_prompt=${encodeURIComponent(input.negativePrompt)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new AppError(
      ERROR_CODES.GENERATION_IMAGE_FAILED,
      `Pollinations fallback failed: HTTP ${response.status}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const imageBase64 = Buffer.from(arrayBuffer).toString("base64");

  return {
    imageBase64,
    mimeType: "image/jpeg",
  };
}
