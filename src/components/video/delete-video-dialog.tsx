"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";

type DeleteVideoDialogProps = {
  videoId: string;
  onDeleted: () => void;
  onCancel: () => void;
};

export function DeleteVideoDialog({ videoId, onDeleted, onCancel }: DeleteVideoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await apiClient.delete<{ deleted: boolean }>(`/api/videos/${videoId}`);
    setLoading(false);

    if (result.error) {
      if (result.error.code === "STORAGE_DELETE_FAILED") {
        setError("Failed to delete video files. Please try again.");
      } else {
        setError(result.error.message);
      }
      return;
    }

    onDeleted();
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Delete video?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This action is permanent. The video and all associated files will be deleted and cannot be
          recovered.
        </p>

        {error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
