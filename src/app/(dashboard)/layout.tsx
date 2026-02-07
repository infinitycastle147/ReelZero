"use client";

import { useEffect } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  // Auto-open sidebar on desktop, auto-close on mobile
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const isDesktop = e.matches;
      const currentlyOpen = useUIStore.getState().isSidebarOpen;

      if (isDesktop && !currentlyOpen) {
        toggleSidebar();
      } else if (!isDesktop && currentlyOpen) {
        toggleSidebar();
      }
    };

    // Set initial state
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [toggleSidebar]);

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr]">
      {/* Header — full width */}
      <DashboardHeader />

      {/* Body — sidebar + main content */}
      <div className="relative grid lg:grid-cols-[256px_1fr]">
        {/* Mobile overlay backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 border-r bg-background pt-16 transition-transform duration-200 lg:static lg:z-auto lg:pt-0 lg:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <DashboardSidebar />
        </aside>

        {/* Main content */}
        <main className="overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
