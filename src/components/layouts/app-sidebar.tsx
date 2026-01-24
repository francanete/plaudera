"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  MessageSquare,
  Shield,
  Lightbulb,
  LayoutPanelLeft,
  Copy,
} from "lucide-react";
import { PlauderaLogo } from "@/components/plaudera-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { appConfig } from "@/lib/config";

type SubscriptionStatus =
  | "ACTIVE"
  | "CANCELED"
  | "PAST_DUE"
  | "TRIALING"
  | "NONE";

interface AppSidebarProps {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
  plan: "FREE" | "STARTER" | "GROWTH" | "SCALE";
  subscriptionStatus?: SubscriptionStatus;
  expiresAt?: Date | null;
  isAdmin?: boolean;
  pendingDuplicatesCount?: number;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Ideas", href: "/dashboard/ideas", icon: Lightbulb },
  { name: "Duplicates", href: "/dashboard/duplicates", icon: Copy },
  { name: "Board", href: "/dashboard/board", icon: LayoutPanelLeft },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
];

const adminNavigation = [
  { name: "Tiers", href: "/dashboard/admin/tiers", icon: Shield },
];

export function AppSidebar({
  user,
  plan,
  subscriptionStatus,
  expiresAt,
  isAdmin,
  pendingDuplicatesCount = 0,
}: AppSidebarProps) {
  // Build badges map for nav items with counts
  const badges: Record<string, number> = {};
  if (pendingDuplicatesCount > 0) {
    badges["/dashboard/duplicates"] = pendingDuplicatesCount;
  }
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href="/"
                className="group-data-[collapsible=icon]:justify-center"
              >
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
                  <PlauderaLogo />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">
                    {appConfig.name}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navigation} badges={badges} />
        {isAdmin && (
          <>
            <SidebarSeparator />
            <NavMain items={adminNavigation} label="Admin" />
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={user}
          plan={plan}
          subscriptionStatus={subscriptionStatus}
          expiresAt={expiresAt}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
