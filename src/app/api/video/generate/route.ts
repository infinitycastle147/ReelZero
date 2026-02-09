import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { generateScript } from "@/lib/ai/script-generation";
import type { ScriptTheme } from "@/lib/ai/types";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

const VALID_THEMES: ScriptTheme[] = [
  "realistic",
  "anime",
  "artistic",
  "cinematic",
  "minimalist",
];

type GenerateRequestBody = {
  prompt: string;
  theme: ScriptTheme;
  videoId: string;
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();

  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const body = (await request.json()) as GenerateRequestBody;

  if (!body.prompt || typeof body.prompt !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "prompt is required");
  }

  if (!body.theme || !VALID_THEMES.includes(body.theme)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `theme must be one of: ${VALID_THEMES.join(", ")}`,
    );
  }

  if (!body.videoId || typeof body.videoId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId is required");
  }

  const script = await generateScript({
    prompt: body.prompt,
    theme: body.theme,
    videoId: body.videoId,
  });

  return NextResponse.json({ data: script });
});
