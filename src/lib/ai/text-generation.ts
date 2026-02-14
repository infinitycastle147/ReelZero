// Gemini 2.5 Flash text generation with JSON response mode

import { AI_CONFIG } from "@/lib/ai/config";
import { withRetry, RetryableError } from "@/lib/ai/retry";
import type { TextGenerationInput, TextGenerationOutput } from "@/lib/ai/types";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

// Gemini JSON schema for script generation
const SCRIPT_JSON_SCHEMA = {
  type: "object",
  properties: {
    total_duration: { type: "integer" },
    scenes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          scene_number: { type: "integer" },
          narration: { type: "string" },
          visual_description: { type: "string" },
          duration_seconds: { type: "integer" },
          keywords: { type: "array", items: { type: "string" } },
        },
        required: [
          "scene_number",
          "narration",
          "visual_description",
          "duration_seconds",
          "keywords",
        ],
      },
    },
  },
  required: ["total_duration", "scenes"],
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
};

// Content-policy finish reasons that indicate blocked content
const SAFETY_FINISH_REASONS = ["SAFETY", "RECITATION"];

export async function generateText(input: TextGenerationInput): Promise<TextGenerationOutput> {
  const responseFormat = input.options?.responseFormat ?? "json";

  const requestBody: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: input.prompt }],
      },
    ],
    generationConfig: {
      temperature: input.options?.temperature ?? 0.7,
      maxOutputTokens: input.options?.maxTokens ?? 8192,
    },
  };

  // Add JSON mode config
  if (responseFormat === "json") {
    (requestBody.generationConfig as Record<string, unknown>).responseMimeType =
      "application/json";
    (requestBody.generationConfig as Record<string, unknown>).responseSchema =
      SCRIPT_JSON_SCHEMA;
  }

  const url = `${AI_CONFIG.gemini.textEndpoint}?key=${AI_CONFIG.gemini.apiKey}`;

  const result = await withRetry(async () => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as GeminiGenerateContentResponse;

      // Content-policy rejection (HTTP 400 with safety reasons)
      if (response.status === 400) {
        const finishReason = errorBody.candidates?.[0]?.finishReason;
        if (finishReason && SAFETY_FINISH_REASONS.includes(finishReason)) {
          throw new AppError(
            ERROR_CODES.GENERATION_SCRIPT_FAILED,
            "Your prompt was flagged by content safety filters. Please try rephrasing your request.",
          );
        }
      }

      throw new RetryableError(
        errorBody.error?.message ?? `Gemini API error: ${response.status}`,
        response.status,
      );
    }

    return response.json() as Promise<GeminiGenerateContentResponse>;
  });

  // Check finish reason in successful responses
  const finishReason = result.candidates?.[0]?.finishReason;
  if (finishReason && SAFETY_FINISH_REASONS.includes(finishReason)) {
    throw new AppError(
      ERROR_CODES.GENERATION_SCRIPT_FAILED,
      "Your prompt was flagged by content safety filters. Please try rephrasing your request.",
    );
  }

  if (finishReason === "MAX_TOKENS") {
    throw new RetryableError("Gemini response truncated (MAX_TOKENS) — retrying", 429);
  }

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new AppError(
      ERROR_CODES.GENERATION_SCRIPT_FAILED,
      "No text returned from Gemini API",
    );
  }

  return { text };
}
