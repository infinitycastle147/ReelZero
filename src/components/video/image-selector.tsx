"use client";

import { AlertCircle, ImageIcon } from "lucide-react";
import Image from "next/image";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageDropzone } from "@/components/video/image-dropzone";
import { useVideoStore } from "@/store/video-store";

type ImageSelectorProps = {
  sceneId: string;
  sceneIndex: number;
  onRetryAi?: () => void;
};

export function ImageSelector({ sceneId, sceneIndex, onRetryAi }: ImageSelectorProps) {
  const scene = useVideoStore((s) => s.scenes.find((sc) => sc.id === sceneId));

  if (!scene) return null;

  const hasAiImage = !!scene.imageUrl && scene.imageSource === "ai";
  const hasUploadedImage = !!scene.imageUrl && scene.imageSource === "upload";
  const aiGenFailed = scene.imageStatus === "error" && scene.imageSource === "ai";

  // Default to "upload" tab unless there's already an AI image present.
  // AI generation is opt-in — user clicks the button above to trigger it.
  const defaultTab = hasAiImage ? "ai" : "upload";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="ai" className="flex-1">
          AI Generate
        </TabsTrigger>
        <TabsTrigger value="upload" className="flex-1">
          Upload
        </TabsTrigger>
      </TabsList>

      {/* AI Generate tab */}
      <TabsContent value="ai" className="mt-3">
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-muted">
          {hasAiImage && scene.imageUrl ? (
            <Image
              src={scene.imageUrl}
              alt={`Scene ${sceneIndex + 1} AI-generated image`}
              fill
              className="object-cover"
            />
          ) : aiGenFailed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
              <p className="text-xs font-medium text-destructive">AI generation failed</p>
              <p className="text-xs text-muted-foreground">
                Switch to the &ldquo;Upload&rdquo; tab to use your own image, or{" "}
                {onRetryAi ? (
                  <button
                    onClick={onRetryAi}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    retry
                  </button>
                ) : (
                  "retry using the button above"
                )}
                .
              </p>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" aria-hidden="true" />
              <p className="text-xs font-medium">No AI image yet</p>
              <p className="text-xs opacity-70">
                Click &ldquo;Generate All Images&rdquo; above to use AI, or upload your own image in the{" "}
                &ldquo;Upload&rdquo; tab.
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Upload tab */}
      <TabsContent value="upload" className="mt-3">
        <ImageDropzone sceneId={sceneId} hasImage={hasUploadedImage} />
      </TabsContent>
    </Tabs>
  );
}
