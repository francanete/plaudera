"use client";

import { Bell, Check, Clock, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockupProps } from "@/lib/features-config";

const notifications = [
  {
    icon: Check,
    iconBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
    iconRing: "ring-emerald-200/50",
    iconColor: "text-emerald-600",
    title: "System update completed",
    subtitle: "All services running normally",
    time: "2m",
    delay: 0,
  },
  {
    icon: UserPlus,
    iconBg: "bg-gradient-to-br from-blue-50 to-blue-100",
    iconRing: "ring-blue-200/50",
    iconColor: "text-blue-600",
    title: "New user registered",
    subtitle: "Sarah joined your workspace",
    time: "1h",
    delay: 150,
  },
  {
    icon: Clock,
    iconBg: "bg-gradient-to-br from-amber-50 to-amber-100",
    iconRing: "ring-amber-200/50",
    iconColor: "text-amber-600",
    title: "Backup scheduled",
    subtitle: "Daily backup at 2:00 AM",
    time: "3h",
    delay: 300,
  },
];

export function NotificationCardMockup({ className, isInView }: MockupProps) {
  return (
    <div
      className={cn(
        "w-full max-w-sm overflow-hidden rounded-xl",
        "bg-white/90 backdrop-blur-sm",
        "border border-slate-200/60",
        "shadow-xl shadow-slate-200/50",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse-glow h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium tracking-wide text-slate-500">
              Live
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            3 new
          </span>
        </div>
        <Bell className="h-4 w-4 text-slate-400" />
      </div>

      {/* Content */}
      <div className="space-y-1 p-2">
        {notifications.map((notification, index) => {
          const Icon = notification.icon;
          const isLast = index === notifications.length - 1;

          return (
            <div
              key={index}
              className={cn(
                "flex items-start space-x-3 rounded-lg p-3",
                "transition-all duration-500 ease-out",
                "hover:bg-slate-50/80",
                isInView
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-4 opacity-0",
                !isLast && "border-b border-slate-100/50"
              )}
              style={{
                transitionDelay: isInView ? `${notification.delay}ms` : "0ms",
              }}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  "ring-1",
                  notification.iconBg,
                  notification.iconRing
                )}
              >
                <Icon className={cn("h-4 w-4", notification.iconColor)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tracking-tight text-slate-900">
                  {notification.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {notification.subtitle}
                </p>
              </div>
              <span className="text-xs text-slate-400 tabular-nums">
                {notification.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
