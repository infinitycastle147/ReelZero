// Gemini 2.5 Flash Image generation — generateContent with IMAGE modality

import { AI_CONFIG } from "@/lib/ai/config";
import { withRetry, RetryableError } from "@/lib/ai/retry";
import type { ImageGenerationInput, ImageGenerationOutput } from "@/lib/ai/types";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

type GeminiImagePart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiImageResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiImagePart[];
    };
    finishReason?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
};

const SAFETY_FINISH_REASONS = ["SAFETY", "RECITATION"];

export async function generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
  const aspectRatio = input.options?.aspectRatio ?? "1:1";

  const requestBody = {
    contents: [
      {
        parts: [{ text: input.prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imagenConfig: {
        aspectRatio,
      },
    },
  };

  const url = `${AI_CONFIG.gemini.imageEndpoint}?key=${AI_CONFIG.gemini.apiKey}`;

  const result = await withRetry(async () => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as GeminiImageResponse;

      // Content-policy rejection
      if (response.status === 400) {
        const finishReason = errorBody.candidates?.[0]?.finishReason;
        if (finishReason && SAFETY_FINISH_REASONS.includes(finishReason)) {
          throw new AppError(
            ERROR_CODES.GENERATION_IMAGE_FAILED,
            "Image generation was blocked by content safety filters. Please try a different description.",
          );
        }
      }

      throw new RetryableError(
        errorBody.error?.message ?? `Gemini Image API error: ${response.status}`,
        response.status,
      );
    }

    return response.json() as Promise<GeminiImageResponse>;
  });

  // Check for safety in successful response
  const finishReason = result.candidates?.[0]?.finishReason;
  if (finishReason && SAFETY_FINISH_REASONS.includes(finishReason)) {
    throw new AppError(
      ERROR_CODES.GENERATION_IMAGE_FAILED,
      "Image generation was blocked by content safety filters. Please try a different description.",
    );
  }

  // Find the image part in the response
  const parts = result.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new AppError(
      ERROR_CODES.GENERATION_IMAGE_FAILED,
      "No image data returned from Gemini API",
    );
  }

  const imagePart = parts.find(
    (part): part is { inlineData: { mimeType: string; data: string } } =>
      "inlineData" in part,
  );

  if (!imagePart) {
    throw new AppError(
      ERROR_CODES.GENERATION_IMAGE_FAILED,
      "No inline image data found in Gemini response",
    );
  }

  return {
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}
