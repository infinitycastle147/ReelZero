// F008: POST /api/video/render/stage — Renderer stage update callback
// Called by ReelZero-Renderer to advance the current_stage as processing progresses.
// Auth: x-render-secret shared secret.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { updateVideo } from "@/lib/db/queries/videos";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";
import type { RenderStageCallback } from "@/types/render";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Validate shared secret
  const renderSecret = process.env["RENDER_WEBHOOK_SECRET"];
  const incomingSecret = request.headers.get("x-render-secret");

  if (!renderSecret || incomingSecret !== renderSecret) {
    return NextResponse.json(
      { error: { code: "AUTH_UNAUTHORIZED", message: "Invalid render secret" } },
      { status: 401 }
    );
  }

  const body = (await request.json()) as RenderStageCallback;

  if (!body.videoId) {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "videoId is required");
  }

  if (!body.stage || !["sync", "render", "finalize"].includes(body.stage)) {
    throw new AppError(ERROR_CODES.VALIDATION_INVALID_INPUT, "stage must be one of: sync, render, finalize");
  }

  await updateVideo(body.videoId, { current_stage: body.stage });

  return NextResponse.json({ data: { received: true } });
});
