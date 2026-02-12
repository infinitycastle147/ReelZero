"use client";

import { ImageIcon } from "lucide-react";
import Image from "next/image";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageDropzone } from "@/components/video/image-dropzone";
import { useVideoStore } from "@/store/video-store";

type ImageSelectorProps = {
  sceneId: string;
  sceneIndex: number;
};

export function ImageSelector({ sceneId, sceneIndex }: ImageSelectorProps) {
  const scene = useVideoStore((s) => s.scenes.find((sc) => sc.id === sceneId));

  if (!scene) return null;

  const hasAiImage = !!scene.imageUrl && scene.imageSource === "ai";
  const hasUploadedImage = !!scene.imageUrl && scene.imageSource === "upload";

  return (
    <Tabs defaultValue="ai" className="w-full">
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
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" aria-hidden="true" />
              <p className="text-xs">Waiting for generation…</p>
              <p className="text-xs opacity-70">
                Use &ldquo;Generate All Images&rdquo; above to create AI images
                for all scenes.
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Upload tab */}
      <TabsContent value="upload" className="mt-3">
        <ImageDropzone
          sceneId={sceneId}
          hasImage={hasUploadedImage}
        />
      </TabsContent>
    </Tabs>
  );
}
