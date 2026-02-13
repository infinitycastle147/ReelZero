import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { VideoLibraryClient } from "@/components/video/video-library-client";
import { VideoLibrarySkeleton } from "@/components/video/video-library-skeleton";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { listVideosFiltered } from "@/lib/db/queries/videos";

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    redirect("/sign-in");
  }

  const params = await searchParams;

  const page = Math.max(1, parseInt(String(params.page ?? "1"), 10) || 1);
  const search = typeof params.search === "string" ? params.search : undefined;
  const sort = params.sort === "oldest" ? "oldest" as const : "newest" as const;
  const rawDateFilter = params.dateFilter;
  const dateFilter =
    rawDateFilter === "today" ||
    rawDateFilter === "this_week" ||
    rawDateFilter === "this_month" ||
    rawDateFilter === "all"
      ? rawDateFilter
      : "all" as const;

  const result = await listVideosFiltered(dbUser.id, {
    page,
    pageSize: 12,
    search,
    sort,
    dateFilter,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Videos</h1>
        <p className="text-sm text-muted-foreground">
          {result.total} video{result.total !== 1 ? "s" : ""}
        </p>
      </div>

      <Suspense fallback={<VideoLibrarySkeleton />}>
        <VideoLibraryClient
          initialVideos={result.items}
          initialTotal={result.total}
          initialPage={result.page}
          totalPages={result.totalPages}
          initialParams={{ page, search, sort, dateFilter, pageSize: 12 }}
        />
      </Suspense>
    </div>
  );
}
