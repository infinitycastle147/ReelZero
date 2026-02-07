import { auth } from "@clerk/nextjs/server";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";

export async function getAuthUser(): Promise<{ userId: string }> {
  const { userId } = await auth();

  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  return { userId };
}
