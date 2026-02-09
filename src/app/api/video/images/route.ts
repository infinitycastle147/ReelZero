import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { generateSceneImages } from "@/lib/ai/scene-image-generation";
import type { ScriptTheme, GenerateSceneImageInput } from "@/lib/ai/types";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

type SceneInput = {
  visualDescription: string;
  sceneNumber: number;
};

type ImagesRequestBody = {
  scenes: SceneInput[];
  theme: ScriptTheme;
  videoId: string;
  userId: string;
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const body = (await request.json()) as ImagesRequestBody;

  if (!body.scenes || !Array.isArray(body.scenes) || body.scenes.length === 0) {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "scenes array is required");
  }

  if (!body.theme || typeof body.theme !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "theme is required");
  }

  if (!body.videoId || typeof body.videoId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId is required");
  }

  if (!body.userId || typeof body.userId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "userId is required");
  }

  // Map request body to GenerateSceneImageInput[]
  const inputs: GenerateSceneImageInput[] = body.scenes.map((scene) => ({
    visualDescription: scene.visualDescription,
    theme: body.theme,
    videoId: body.videoId,
    userId: body.userId,
    sceneNumber: scene.sceneNumber,
  }));

  const result = await generateSceneImages(inputs, body.videoId);

  return NextResponse.json({ data: result });
});
