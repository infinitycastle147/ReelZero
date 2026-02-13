import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { VideoWizard } from "@/components/video/video-wizard";

// Server Component — auth check + render boundary
export default async function CreateVideoPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Create Video</h1>
        <p className="text-muted-foreground">
          Generate an AI-powered short-form video from a text prompt.
        </p>
      </div>

      {/* Suspense required because VideoWizard uses useSearchParams (T030a) */}
      <Suspense>
        <VideoWizard />
      </Suspense>
    </div>
  );
}
