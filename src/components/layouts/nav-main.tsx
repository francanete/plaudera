"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavMainProps {
  items: NavItem[];
  label?: string;
  badges?: Record<string, number>;
}

export function NavMain({ items, label, badges = {} }: NavMainProps) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");
            const badgeCount = badges[item.href];
            return (
              <SidebarMenuItem key={item.name} className="relative">
                {isActive && (
                  <span className="bg-sidebar-primary absolute top-1 bottom-1 left-0 w-[3px] rounded-full" />
                )}
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.name}
                  id={`tour-nav-${item.name.toLowerCase()}`}
                  className={isActive ? "font-semibold" : ""}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
                {badgeCount !== undefined && badgeCount > 0 && (
                  <SidebarMenuBadge className="bg-destructive rounded-full px-2 font-semibold text-white shadow-sm peer-hover/menu-button:text-white peer-data-[active=true]/menu-button:text-white">
                    {badgeCount}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
