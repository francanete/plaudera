"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitMerge, Plus, Settings } from "lucide-react";
import Link from "next/link";

const actions = [
  {
    title: "Add New Idea",
    description: "Go to ideas list",
    href: "/dashboard/ideas",
    icon: Plus,
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    title: "Review Duplicates",
    description: "Review AI-detected duplicates",
    href: "/dashboard/duplicates",
    icon: GitMerge,
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  {
    title: "Board Settings",
    description: "Configure public board",
    href: "/dashboard/board",
    icon: Settings,
    iconBg: "bg-gray-100 dark:bg-gray-800",
    iconColor: "text-gray-600 dark:text-gray-400",
  },
];

export function QuickActions() {
  return (
    <Card id="tour-quick-actions">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="flex items-center gap-4 rounded-lg border border-gray-200 p-3 transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-900"
          >
            <div className={`rounded-full p-2.5 ${action.iconBg}`}>
              <action.icon className={`h-5 w-5 ${action.iconColor}`} />
            </div>
            <div>
              <p className="font-medium">{action.title}</p>
              <p className="text-muted-foreground text-sm">
                {action.description}
              </p>
            </div>
          </Link>
        ))}
        <p className="text-muted-foreground pt-2 text-xs">
          Review duplicates, manage ideas, or customize your board settings.
        </p>
      </CardContent>
    </Card>
  );
}
