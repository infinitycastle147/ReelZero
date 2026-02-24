"use client";
// F009: T027 — Client Component for video detail page action buttons.
// Handles the delete dialog state so the parent Server Component stays async.

import { Download, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DeleteVideoDialog } from "@/components/video/delete-video-dialog";
import { downloadFile } from "@/lib/utils";

type VideoDetailActionsProps = {
  videoId: string;
  title: string;
  status: "processing" | "completed" | "failed";
  signedVideoUrl: string | null;
};

export function VideoDetailActions({
  videoId,
  title,
  status,
  signedVideoUrl,
}: VideoDetailActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  function handleDeleted() {
    router.push("/videos");
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        {status === "failed" && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/create?regenerateFrom=${videoId}`}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Regenerate
            </Link>
          </Button>
        )}
        {status === "completed" && signedVideoUrl && (
          <Button size="sm" onClick={() => downloadFile(signedVideoUrl, `${title}.mp4`)}>
            <Download className="mr-1.5 h-4 w-4" />
            Download MP4
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="mr-1.5 h-4 w-4 text-destructive" />
          <span className="text-destructive">Delete</span>
        </Button>
      </div>

      {showDeleteDialog && (
        <DeleteVideoDialog
          videoId={videoId}
          onDeleted={handleDeleted}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </>
  );
}
