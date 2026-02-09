import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { generateAudio } from "@/lib/ai/tts";
import { TTS_MAX_CHARACTERS } from "@/lib/constants/ai";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

type AudioRequestBody = {
  narrationText: string;
  voiceId: string;
  videoId: string;
  userId: string;
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const body = (await request.json()) as AudioRequestBody;

  if (!body.narrationText || typeof body.narrationText !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "narrationText is required");
  }

  if (body.narrationText.length > TTS_MAX_CHARACTERS) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `Narration text exceeds ${TTS_MAX_CHARACTERS} character limit`,
    );
  }

  if (!body.voiceId || typeof body.voiceId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "voiceId is required");
  }

  if (!body.videoId || typeof body.videoId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId is required");
  }

  if (!body.userId || typeof body.userId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "userId is required");
  }

  const result = await generateAudio({
    narrationText: body.narrationText,
    voiceId: body.voiceId,
    videoId: body.videoId,
    userId: body.userId,
  });

  return NextResponse.json({
    data: {
      storageUrl: result.storageUrl,
      alignment: result.alignment,
      durationSeconds: result.durationSeconds,
    },
  });
});
