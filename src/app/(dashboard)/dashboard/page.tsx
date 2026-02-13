import { auth, currentUser } from "@clerk/nextjs/server";
import { Plus, Video } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageChart } from "@/components/video/usage-chart";
import { VideoCard } from "@/components/video/video-card";
import { getSubscriptionByClerkUserId } from "@/lib/db/queries/subscriptions";
import { getMonthlyUsageStats } from "@/lib/db/queries/usage";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { listVideosFiltered } from "@/lib/db/queries/videos";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  const firstName = clerkUser?.firstName ?? "there";

  const dbUser = await getUserByClerkId(userId);
  if (!dbUser) {
    redirect("/sign-in");
  }

  // Use billing_cycle_start as "this month" window start if available
  const subscription = await getSubscriptionByClerkUserId(userId);
  const billingCycleStart = subscription?.billing_cycle_start ?? undefined;

  // Parallel fetch: recent videos + usage stats
  const [recentResult, stats] = await Promise.all([
    listVideosFiltered(dbUser.id, { page: 1, pageSize: 5 }),
    getMonthlyUsageStats(dbUser.id, billingCycleStart),
  ]);

  const recentVideos = recentResult.items;
  const createHref = stats.creditsRemaining === 0 ? "/billing" : "/create";

  return (
    <div className="space-y-8">
      {/* Welcome + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your videos.
          </p>
        </div>
        <Button asChild>
          <Link href={createHref}>
            <Plus className="mr-2 h-4 w-4" />
            Create Video
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credits Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.creditsRemaining}</p>
            <p className="text-xs text-muted-foreground">of {stats.creditsTotal} total</p>
            {stats.creditsRemaining === 0 && (
              <Link href="/billing" className="mt-2 inline-block text-xs text-primary underline">
                Upgrade to generate more
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Videos This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.videosThisMonth}</p>
            <p className="text-xs text-muted-foreground">{stats.creditsUsed} credit{stats.creditsUsed !== 1 ? "s" : ""} used</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart dailyCounts={stats.dailyCounts} />
          </CardContent>
        </Card>
      </div>

      {/* Recent videos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Videos</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/videos">View all</Link>
          </Button>
        </div>

        {recentVideos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
            <Video className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No videos yet. Create your first one!</p>
            <Button asChild size="sm">
              <Link href="/create">Create Video</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentVideos.slice(0, 5).map((video) => (
              <VideoCard key={video.id} video={video} mode="grid" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
