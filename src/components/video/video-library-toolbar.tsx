"use client";

import { LayoutGrid, List, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { VideoDateFilter, VideoListParams, VideoSortOrder } from "@/types/video";

export type ViewMode = "grid" | "list";

const VIEW_PREF_KEY = "reelzero-video-view";

type VideoLibraryToolbarProps = {
  initialParams?: VideoListParams;
  onParamsChange: (params: VideoListParams) => void;
  onViewChange?: (view: ViewMode) => void;
  view?: ViewMode;
};

export function VideoLibraryToolbar({
  initialParams,
  onParamsChange,
  onViewChange,
  view: controlledView,
}: VideoLibraryToolbarProps) {
  // SSR-safe: default grid, read localStorage on mount
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState(initialParams?.search ?? "");
  const [sort, setSort] = useState<VideoSortOrder>(initialParams?.sort ?? "newest");
  const [dateFilter, setDateFilter] = useState<VideoDateFilter>(initialParams?.dateFilter ?? "all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read localStorage view preference after hydration (SSR-safe)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(VIEW_PREF_KEY);
      if (saved === "grid" || saved === "list") {
        setView(saved);
        onViewChange?.(saved);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveView = controlledView ?? view;

  function handleViewToggle(next: ViewMode) {
    setView(next);
    onViewChange?.(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(VIEW_PREF_KEY, next);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onParamsChange({ search: value, sort, dateFilter, page: 1 });
    }, 500);
  }

  function handleSortChange(value: string) {
    const next = value as VideoSortOrder;
    setSort(next);
    onParamsChange({ search, sort: next, dateFilter, page: 1 });
  }

  function handleDateFilterChange(value: string) {
    const next = value as VideoDateFilter;
    setDateFilter(next);
    onParamsChange({ search, sort, dateFilter: next, page: 1 });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search videos…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Sort */}
      <Select value={sort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
        </SelectContent>
      </Select>

      {/* Date filter */}
      <Select value={dateFilter} onValueChange={handleDateFilterChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="this_week">This Week</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
        </SelectContent>
      </Select>

      {/* Grid / List toggle */}
      <div className="flex items-center rounded-md border">
        <Button
          variant="ghost"
          size="sm"
          className={`rounded-r-none ${effectiveView === "grid" ? "bg-accent" : ""}`}
          onClick={() => handleViewToggle("grid")}
          aria-label="Grid view"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`rounded-l-none ${effectiveView === "list" ? "bg-accent" : ""}`}
          onClick={() => handleViewToggle("list")}
          aria-label="List view"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
