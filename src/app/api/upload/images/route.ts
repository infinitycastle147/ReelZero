import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { uploadUserImage } from "@/lib/ai/image-upload";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";

export const runtime = "nodejs";

// userId is derived from auth() — NOT accepted from form data (F007 security patch)
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

  const formData = await request.formData();
  const file = formData.get("file");
  const videoId = formData.get("videoId");

  if (!file || !(file instanceof File)) {
    throw new AppError(ERROR_CODES.VALIDATION_MISSING_FIELD, "file is required");
  }

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // uploadUserImage validates MIME type, file size, resizes to TARGET_IMAGE_WIDTH x TARGET_IMAGE_HEIGHT (FR-017)
  const result = await uploadUserImage({
    file: buffer,
    originalFilename: file.name,
    mimeType: file.type,
    userId: dbUser.id,
    videoId: typeof videoId === "string" ? videoId : undefined,
  });

  return NextResponse.json({ data: result });
});
