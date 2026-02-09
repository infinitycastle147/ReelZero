import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { uploadUserImage } from "@/lib/ai/image-upload";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const userId = formData.get("userId");
  const videoId = formData.get("videoId");

  if (!file || !(file instanceof File)) {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "file is required");
  }

  if (!userId || typeof userId !== "string") {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "userId is required");
  }

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await uploadUserImage({
    file: buffer,
    originalFilename: file.name,
    mimeType: file.type,
    userId,
    videoId: typeof videoId === "string" ? videoId : undefined,
  });

  return NextResponse.json({ data: result });
});
