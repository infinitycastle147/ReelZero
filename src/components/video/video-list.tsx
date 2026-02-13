import { VideoCard } from "@/components/video/video-card";
import type { Video } from "@/lib/db/schema";

type VideoListProps = {
  videos: Video[];
  onDeleteRequest?: (videoId: string) => void;
};

export function VideoList({ videos, onDeleteRequest }: VideoListProps) {
  return (
    <div className="flex flex-col gap-2">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} mode="list" onDeleteRequest={onDeleteRequest} />
      ))}
    </div>
  );
}
