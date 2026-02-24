import { auth } from "@clerk/nextjs/server";
import { Clapperboard } from "lucide-react";
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
      {/* Page header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Create a Video
          </h1>
          <p className="text-sm text-muted-foreground">
            AI-powered short-form video in under 2 minutes.
          </p>
        </div>
      </div>

      {/* Suspense required because VideoWizard uses useSearchParams (T030a) */}
      <Suspense>
        <VideoWizard />
      </Suspense>
    </div>
  );
}
