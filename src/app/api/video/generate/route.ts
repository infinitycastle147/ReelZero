import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { generateScript } from "@/lib/ai/script-generation";
import type { ScriptTheme } from "@/lib/ai/types";
import { PROMPT_MAX_LENGTH, PROMPT_MIN_LENGTH } from "@/lib/constants/ai";
import { MAX_SCENES, MIN_SCENES } from "@/lib/constants/video";
import { checkCredits, refundCredit, reserveCredit } from "@/lib/db/queries/subscriptions";
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
  sceneCount?: number;
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

  // Route-level prompt length guard (FR-004 — AI layer also validates but route must return correct error code)
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
      `theme must be one of: ${VALID_THEMES.join(", ")}`,
    );
  }

  if (!body.videoId || typeof body.videoId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId is required");
  }

  if (
    body.sceneCount !== undefined &&
    (typeof body.sceneCount !== "number" ||
      !Number.isInteger(body.sceneCount) ||
      body.sceneCount < MIN_SCENES ||
      body.sceneCount > MAX_SCENES)
  ) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `sceneCount must be an integer between ${MIN_SCENES} and ${MAX_SCENES}`,
    );
  }

  // Credit enforcement: check and reserve before any AI calls (FR-006, FR-007)
  const creditCheck = await checkCredits(userId);
  if (!creditCheck.canGenerate) {
    throw new AppError(ERROR_CODES.CREDIT_INSUFFICIENT);
  }

  const reserved = await reserveCredit(userId);
  if (!reserved) {
    throw new AppError(ERROR_CODES.CREDIT_INSUFFICIENT);
  }

  let script;
  try {
    script = await generateScript({
      prompt: body.prompt,
      theme: body.theme,
      videoId: body.videoId,
      sceneCount: body.sceneCount,
    });
  } catch (err) {
    // Refund credit on any generation failure
    await refundCredit(userId);
    throw err;
  }

  return NextResponse.json({ data: script });
});
