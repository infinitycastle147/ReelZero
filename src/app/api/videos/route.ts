// F009: GET /api/videos — paginated, filtered video library for the authenticated user

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getUserByClerkId } from "@/lib/db/queries/users";
import { listVideosFiltered } from "@/lib/db/queries/videos";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODES } from "@/lib/errors/codes";
import { withErrorHandler } from "@/lib/errors/middleware";
import type { VideoDateFilter, VideoSortOrder } from "@/types/video";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED);
  }

  const dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, "User not found");
  }

  const { searchParams } = request.nextUrl;

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(12, Math.max(1, parseInt(searchParams.get("pageSize") ?? "12", 10) || 12));
  const search = searchParams.get("search") ?? undefined;

  const rawSort = searchParams.get("sort");
  const sort: VideoSortOrder =
    rawSort === "oldest" || rawSort === "newest" ? rawSort : "newest";

  const rawDateFilter = searchParams.get("dateFilter");
  const dateFilter: VideoDateFilter =
    rawDateFilter === "today" ||
    rawDateFilter === "this_week" ||
    rawDateFilter === "this_month" ||
    rawDateFilter === "all"
      ? rawDateFilter
      : "all";

  const result = await listVideosFiltered(dbUser.id, {
    page,
    pageSize,
    search,
    sort,
    dateFilter,
  });

  return NextResponse.json({
    data: {
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    },
  });
});
