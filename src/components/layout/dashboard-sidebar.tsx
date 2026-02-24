"use client";

import {
  CreditCard,
  LayoutDashboard,
  PlusCircle,
  Video,
} from "lucide-react";

import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";
import { cn } from "@/lib/utils";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Create Video", href: "/create", icon: PlusCircle },
  { label: "My Videos", href: "/videos", icon: Video },
  { label: "Billing", href: "/billing", icon: CreditCard },
] as const;

type DashboardSidebarProps = {
  className?: string;
};

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  return (
    <nav className={cn("flex flex-col gap-1 p-4", className)}>
      {navigationItems.map((item) => (
        <SidebarNavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
        />
      ))}
    </nav>
  );
}
