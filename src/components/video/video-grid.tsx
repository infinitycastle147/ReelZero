import { VideoCard } from "@/components/video/video-card";
import type { Video } from "@/lib/db/schema";

type VideoGridProps = {
  videos: Video[];
  onDeleteRequest?: (videoId: string) => void;
};

export function VideoGrid({ videos, onDeleteRequest }: VideoGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} mode="grid" onDeleteRequest={onDeleteRequest} />
      ))}
    </div>
  );
}
