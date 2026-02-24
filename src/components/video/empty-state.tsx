import { Film, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  variant: "no-videos" | "no-results";
  onClear?: () => void;
};

export function EmptyState({ variant, onClear }: EmptyStateProps) {
  if (variant === "no-videos") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-muted ring-4 ring-border/30">
          <Film className="h-8 w-8 text-primary/50" />
        </div>
        <div>
          <p className="font-heading text-lg font-semibold">No videos yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first video to get started.</p>
        </div>
        <Button asChild>
          <Link href="/create">Create your first video</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-muted ring-4 ring-border/30">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="text-lg font-semibold">No videos match your search</p>
        <p className="mt-1 text-sm text-muted-foreground">Try different keywords or clear your filters.</p>
      </div>
      {onClear && (
        <Button variant="outline" onClick={onClear}>
          Clear search
        </Button>
      )}
    </div>
  );
}
