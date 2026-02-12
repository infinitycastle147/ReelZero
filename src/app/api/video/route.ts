import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ScriptTheme } from "@/lib/ai/types";
import { PROMPT_MAX_LENGTH, PROMPT_MIN_LENGTH } from "@/lib/constants/ai";
import { createVideo } from "@/lib/db/queries/videos";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";
import type { CaptionStyle } from "@/types/scene";

const VALID_THEMES: ScriptTheme[] = [
  "realistic",
  "anime",
  "artistic",
  "cinematic",
  "minimalist",
];

const VALID_CAPTION_STYLES: CaptionStyle[] = [
  "word-by-word",
  "full-sentence",
  "none",
];

type CreateVideoRequest = {
  prompt: string;
  theme: ScriptTheme;
  voice: string;
  captionStyle: CaptionStyle;
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();

  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const body = (await request.json()) as CreateVideoRequest;

  if (!body.prompt || typeof body.prompt !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "prompt is required");
  }

  if (
    body.prompt.length < PROMPT_MIN_LENGTH ||
    body.prompt.length > PROMPT_MAX_LENGTH
  ) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `prompt must be between ${PROMPT_MIN_LENGTH} and ${PROMPT_MAX_LENGTH} characters`
    );
  }

  if (!body.theme || !VALID_THEMES.includes(body.theme)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `theme must be one of: ${VALID_THEMES.join(", ")}`
    );
  }

  if (!body.voice || typeof body.voice !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "voice is required");
  }

  if (!body.captionStyle || !VALID_CAPTION_STYLES.includes(body.captionStyle)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `captionStyle must be one of: ${VALID_CAPTION_STYLES.join(", ")}`
    );
  }

  const video = await createVideo({
    user_id: userId,
    title: body.prompt.substring(0, 100),
    prompt: body.prompt,
    metadata: {
      voice: body.voice,
      theme: body.theme,
      captionStyle: body.captionStyle,
    },
  });

  return NextResponse.json({ data: { videoId: video.id } }, { status: 201 });
});
