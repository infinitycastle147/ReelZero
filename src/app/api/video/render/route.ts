import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ScriptTheme } from "@/lib/ai/types";
import { MAX_SCENES, MIN_SCENES } from "@/lib/constants/video";
import { refundCredit, reserveCredit } from "@/lib/db/queries/subscriptions";
import { updateVideo } from "@/lib/db/queries/videos";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";
import type { CaptionStyle, TransitionType } from "@/types/scene";

export const runtime = "nodejs";

type RenderScene = {
  order: number;
  narration: string;
  visualDescription: string;
  imageUrl: string;
  imageSource: "ai" | "upload";
  duration: number | null;
};

type RenderVideoRequest = {
  videoId: string;
  scenes: RenderScene[];
  voice: string;
  theme: ScriptTheme;
  captionStyle: CaptionStyle;
  transitionType: TransitionType;
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();

  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const body = (await request.json()) as RenderVideoRequest;

  // Validate required fields
  if (!body.videoId || typeof body.videoId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId is required");
  }

  if (!body.scenes || !Array.isArray(body.scenes)) {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "scenes array is required");
  }

  // Validate scene count range
  if (body.scenes.length < MIN_SCENES || body.scenes.length > MAX_SCENES) {
    throw new AppError(
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      `scenes must contain between ${MIN_SCENES} and ${MAX_SCENES} items`
    );
  }

  // Validate all scenes have an imageUrl (FR-020, contract requirement)
  const missingImage = body.scenes.find((s) => !s.imageUrl);
  if (missingImage) {
    throw new AppError(
      ERROR_CODES.VALIDATION_MISSING_FIELD,
      `scene ${missingImage.order} is missing an imageUrl`
    );
  }

  if (!body.voice || typeof body.voice !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "voice is required");
  }

  if (!body.theme || typeof body.theme !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "theme is required");
  }

  // Server-side credit reservation (FR-021, Constitution Principle VI)
  const reserved = await reserveCredit(userId);
  if (!reserved) {
    throw new AppError(ERROR_CODES.CREDIT_INSUFFICIENT);
  }

  try {
    // Update video metadata with final wizard choices before dispatch
    await updateVideo(body.videoId, {
      metadata: {
        voice: body.voice,
        theme: body.theme,
        captionStyle: body.captionStyle,
        transitionType: body.transitionType,
        sceneCount: body.scenes.length,
        scenes: body.scenes.map((s) => ({
          order: s.order,
          narration: s.narration,
          visualDescription: s.visualDescription,
          imageUrl: s.imageUrl,
          imageSource: s.imageSource,
        })),
      },
    });

    // Dispatch to renderer microservice (Constitution Principle V — microservice boundary)
    const rendererUrl = process.env["RENDERER_SERVICE_URL"];
    if (!rendererUrl) {
      throw new AppError(ERROR_CODES.RENDER_SERVICE_UNAVAILABLE, "Renderer service not configured");
    }

    const rendererResponse = await fetch(`${rendererUrl}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: body.videoId,
        scenes: body.scenes,
        voice: body.voice,
        theme: body.theme,
        captionStyle: body.captionStyle,
        transitionType: body.transitionType,
      }),
    });

    if (!rendererResponse.ok) {
      throw new AppError(
        ERROR_CODES.RENDER_SERVICE_UNAVAILABLE,
        `Renderer returned ${rendererResponse.status}`
      );
    }
  } catch (err) {
    // Refund credit on any failure after reservation (FR-022)
    await refundCredit(userId);
    throw err;
  }

  return NextResponse.json(
    {
      data: {
        videoId: body.videoId,
        status: "processing" as const,
        estimatedSeconds: 80,
      },
    },
    { status: 202 }
  );
});
