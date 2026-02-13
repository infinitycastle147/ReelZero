"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { DeleteVideoDialog } from "@/components/video/delete-video-dialog";
import { EmptyState } from "@/components/video/empty-state";
import { VideoGrid } from "@/components/video/video-grid";
import { VideoLibraryToolbar, type ViewMode } from "@/components/video/video-library-toolbar";
import { VideoList } from "@/components/video/video-list";
import type { Video } from "@/lib/db/schema";
import type { VideoListParams } from "@/types/video";

type VideoLibraryClientProps = {
  initialVideos: Video[];
  initialTotal: number;
  initialPage: number;
  totalPages: number;
  initialParams: VideoListParams;
};

export function VideoLibraryClient({
  initialVideos,
  initialPage,
  totalPages,
  initialParams,
}: VideoLibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<ViewMode>("grid");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>(initialVideos);

  const currentPage = initialPage;
  const hasSearch =
    !!initialParams.search ||
    (initialParams.dateFilter && initialParams.dateFilter !== "all");

  // Build URL from params and push navigation
  function pushParams(params: VideoListParams) {
    const sp = new URLSearchParams(searchParams.toString());
    if (params.search) {
      sp.set("search", params.search);
    } else {
      sp.delete("search");
    }
    if (params.sort && params.sort !== "newest") {
      sp.set("sort", params.sort);
    } else {
      sp.delete("sort");
    }
    if (params.dateFilter && params.dateFilter !== "all") {
      sp.set("dateFilter", params.dateFilter);
    } else {
      sp.delete("dateFilter");
    }
    if (params.page && params.page > 1) {
      sp.set("page", String(params.page));
    } else {
      sp.delete("page");
    }
    router.push(`/videos?${sp.toString()}`);
  }

  const handleParamsChange = useCallback((params: VideoListParams) => {
    pushParams(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClearSearch() {
    pushParams({ sort: initialParams.sort, dateFilter: "all", page: 1 });
  }

  function handleDeleted() {
    if (deleteTarget) {
      setVideos((prev) => prev.filter((v) => v.id !== deleteTarget));
    }
    setDeleteTarget(null);
  }

  return (
    <>
      {/* Toolbar */}
      <VideoLibraryToolbar
        initialParams={initialParams}
        onParamsChange={handleParamsChange}
        onViewChange={setView}
        view={view}
      />

      {/* Video grid or list */}
      {videos.length === 0 ? (
        hasSearch ? (
          <EmptyState variant="no-results" onClear={handleClearSearch} />
        ) : (
          <EmptyState variant="no-videos" />
        )
      ) : view === "grid" ? (
        <VideoGrid videos={videos} onDeleteRequest={setDeleteTarget} />
      ) : (
        <VideoList videos={videos} onDeleteRequest={setDeleteTarget} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => pushParams({ ...initialParams, page: currentPage - 1 })}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => pushParams({ ...initialParams, page: currentPage + 1 })}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteVideoDialog
          videoId={deleteTarget}
          onDeleted={handleDeleted}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
