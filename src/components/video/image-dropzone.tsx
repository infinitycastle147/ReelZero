"use client";

import Image from "next/image";
import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants/ai";
import { useVideoStore } from "@/store/video-store";

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

type UploadImageData = {
  storageUrl: string;
  storagePath: string;
  fileSizeBytes: number;
};

type ImageDropzoneProps = {
  sceneId: string;
  hasImage: boolean;
};

function validateFile(file: File): string | null {
  // Step 1: size
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `File is too large (max ${MAX_UPLOAD_SIZE_BYTES / 1_048_576} MB).`;
  }
  // Step 2: MIME type
  if (!(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `Unsupported file type. Please upload a JPEG, PNG, or WebP image.`;
  }
  // Step 3: extension
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported file extension. Accepted: ${ALLOWED_EXTENSIONS.join(", ")}.`;
  }
  return null;
}

export function ImageDropzone({ sceneId, hasImage }: ImageDropzoneProps) {
  const { updateScene, setSceneImageStatus, videoId, scenes } = useVideoStore();
  const scene = scenes.find((s) => s.id === sceneId);
  const uploadedImageUrl = hasImage && scene?.imageSource === "upload" ? (scene.imageUrl ?? null) : null;

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFileName(file.name);

    setIsUploading(true);
    setSceneImageStatus(sceneId, "loading");

    const formData = new FormData();
    formData.append("file", file);
    if (videoId) {
      formData.append("videoId", videoId);
    }

    // Use fetch directly for FormData (apiClient uses JSON by default)
    try {
      const res = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const json = (await res.json()) as { data?: UploadImageData; error?: { code: string; message: string } };

      if (!res.ok || json.error) {
        setSceneImageStatus(sceneId, "error");
        setError(json.error?.message ?? "Upload failed. Please try again.");
        return;
      }

      if (json.data) {
        updateScene(sceneId, {
          imageUrl: json.data.storageUrl,
          imageSource: "upload",
          imageStatus: "success",
        });
      }
    } catch {
      setSceneImageStatus(sceneId, "error");
      setError("Upload failed. Please check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset so the same file can be re-selected after error
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={handleChange}
        aria-label="Upload image file"
      />

      {/* Preview — shown when an uploaded image exists */}
      {uploadedImageUrl ? (
        <div className="space-y-2">
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-muted">
            <Image
              src={uploadedImageUrl}
              alt="Uploaded scene image"
              fill
              className="object-cover"
            />
          </div>
          {fileName && (
            <p className="truncate text-xs text-muted-foreground" title={fileName}>
              {fileName}
            </p>
          )}
          {!isUploading && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="w-full"
            >
              Replace Image
            </Button>
          )}
        </div>
      ) : (
        /* Drop target — shown when no image yet or still uploading */
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          aria-label="Drop image here or click to browse"
          className={[
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors duration-150",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/40",
            isUploading ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">
              {isUploading ? "Uploading…" : "Drop image here"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              JPEG, PNG, WebP — max 10 MB
            </p>
          </div>
        </div>
      )}

      {/* Inline validation / upload error */}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
