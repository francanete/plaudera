"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { ChevronsUpDown, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";

type SubscriptionStatus =
  | "ACTIVE"
  | "CANCELED"
  | "PAST_DUE"
  | "TRIALING"
  | "NONE";

interface NavUserProps {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
  plan: "FREE" | "STARTER" | "GROWTH" | "SCALE";
  subscriptionStatus?: SubscriptionStatus;
  expiresAt?: Date | null;
}

function formatPlanName(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
}

function getTrialDaysRemaining(expiresAt: Date): number {
  return Math.max(0, dayjs(expiresAt).diff(dayjs(), "day"));
}

export function NavUser({
  user,
  plan,
  subscriptionStatus,
  expiresAt,
}: NavUserProps) {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  const isTrialing = subscriptionStatus === "TRIALING";
  const trialDaysRemaining = expiresAt ? getTrialDaysRemaining(expiresAt) : 0;

  const getPlanDisplay = () => {
    if (isTrialing && expiresAt) {
      if (trialDaysRemaining === 0) {
        return "Trial ends today";
      }
      return `Trial • ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} remaining`;
    }
    return formatPlanName(plan);
  };

  const handleSignOut = () => {
    signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  // Mobile: Expanded layout with direct actions (no dropdown)
  if (isMobile) {
    return (
      <div className="flex flex-col gap-1">
        {/* User Info Card */}
        <div className="flex items-center gap-3 px-2 py-3" id="tour-nav-user">
          <Avatar className="h-8 w-8 shrink-0 rounded-full">
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || user.email}
            />
            <AvatarFallback className="rounded-full">{initials}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">
              {user.name || user.email}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {getPlanDisplay()}
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="bg-sidebar-border mx-2 h-px" />

        {/* Direct Actions */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-9"
              onClick={() => setOpenMobile(false)}
            >
              <Link href="/dashboard/account">
                <User className="h-4 w-4" />
                <span>Account</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-9" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    );
  }

  // Desktop: Existing dropdown behavior
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
              id="tour-nav-user"
            >
              <Avatar className="h-8 w-8 shrink-0 rounded-full">
                <AvatarImage
                  src={user.image || undefined}
                  alt={user.name || user.email}
                />
                <AvatarFallback className="rounded-full">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">
                  {user.name || user.email}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {getPlanDisplay()}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage
                    src={user.image || undefined}
                    alt={user.name || user.email}
                  />
                  <AvatarFallback className="rounded-full">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user.name || user.email}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {getPlanDisplay()}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/account">
                  <User className="mr-2 h-4 w-4" />
                  Account
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
