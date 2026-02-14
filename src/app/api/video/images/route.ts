import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { generateSceneImages } from "@/lib/ai/scene-image-generation";
import type { ScriptTheme, GenerateSceneImageInput } from "@/lib/ai/types";
import { MAX_SCENES } from "@/lib/constants/video";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

type SceneInput = {
  visualDescription: string;
  sceneNumber: number;
};

// userId removed from request body — derived from auth() server-side (F007 security patch)
type ImagesRequestBody = {
  scenes: SceneInput[];
  theme: ScriptTheme;
  videoId: string;
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  // Resolve Clerk ID → Supabase UUID (uploaded_images.user_id + storage path are UUID-based)
  const dbUser = await getUserByClerkId(clerkUserId);
  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "User not found");
  }

  const body = (await request.json()) as ImagesRequestBody;

  if (!body.scenes || !Array.isArray(body.scenes) || body.scenes.length === 0) {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "scenes array is required");
  }

  // Cap scene count to MAX_SCENES (FR-026 security guard)
  if (body.scenes.length > MAX_SCENES) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `scenes array must not exceed ${MAX_SCENES} scenes`
    );
  }

  if (!body.theme || typeof body.theme !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "theme is required");
  }

  if (!body.videoId || typeof body.videoId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId is required");
  }

  // Map request body to GenerateSceneImageInput[] — use Supabase UUID, not Clerk ID
  const inputs: GenerateSceneImageInput[] = body.scenes.map((scene) => ({
    visualDescription: scene.visualDescription,
    theme: body.theme,
    videoId: body.videoId,
    userId: dbUser.id,
    sceneNumber: scene.sceneNumber,
  }));

  const result = await generateSceneImages(inputs, body.videoId);

  return NextResponse.json({ data: result });
});
