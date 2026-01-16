"use client";

import { MessageSquare, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockupProps } from "@/lib/features-config";

const teamMembers = [
  { initials: "JD", gradient: "from-violet-400 to-violet-600", online: false },
  { initials: "AS", gradient: "from-blue-400 to-blue-600", online: true },
  { initials: "MK", gradient: "from-amber-400 to-amber-600", online: false },
  { initials: "SR", gradient: "from-rose-400 to-rose-600", online: false },
];

const activities = [
  {
    userIndex: 0,
    action: "uploaded new designs",
    time: "2m ago",
    delay: 200,
  },
  {
    userIndex: 1,
    action: "left a comment",
    time: "5m ago",
    delay: 350,
    comment: "Looks great, let's ship it! 🚀",
  },
  {
    userIndex: 2,
    action: "updated the timeline",
    time: "1h ago",
    delay: 500,
  },
];

export function TeamCollaborationMockup({ className, isInView }: MockupProps) {
  return (
    <div
      className={cn(
        "w-full max-w-sm overflow-hidden rounded-xl",
        "bg-white",
        "border border-slate-100",
        "shadow-xl shadow-slate-200/50",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white p-5">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Folder className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Project Alpha
            </h3>
            <div className="mt-0.5 flex items-center space-x-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500">Active</span>
            </div>
          </div>
        </div>

        {/* Avatar Stack */}
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className={cn(
                  "relative h-8 w-8 rounded-full ring-2 ring-white",
                  "transition-all duration-300 ease-out",
                  isInView ? "scale-100 opacity-100" : "scale-50 opacity-0"
                )}
                style={{
                  transitionDelay: isInView
                    ? `${(teamMembers.length - 1 - index) * 75}ms`
                    : "0ms",
                }}
              >
                <div
                  className={cn(
                    "flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br",
                    member.gradient
                  )}
                >
                  <span className="text-[10px] font-semibold text-white">
                    {member.initials}
                  </span>
                </div>
                {member.online && (
                  <div className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>
            ))}
          </div>
          <div
            className={cn(
              "ml-1 flex h-8 items-center rounded-full bg-slate-100 px-2.5",
              "transition-all delay-300 duration-300",
              isInView ? "scale-100 opacity-100" : "scale-75 opacity-0"
            )}
          >
            <span className="text-[10px] font-medium text-slate-500">+2</span>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="relative p-5">
        {/* Timeline Connector */}
        <div className="absolute top-8 bottom-8 left-[29px] w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />

        <div className="space-y-4">
          {activities.map((activity, index) => {
            const member = teamMembers[activity.userIndex];
            const isLast = index === activities.length - 1;

            return (
              <div
                key={index}
                className={cn(
                  "relative flex items-start space-x-3",
                  "transition-all duration-500 ease-out",
                  isInView
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-4 opacity-0",
                  isLast && "opacity-60"
                )}
                style={{
                  transitionDelay: isInView ? `${activity.delay}ms` : "0ms",
                }}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-2 ring-white",
                    member.gradient
                  )}
                >
                  <span className="text-[9px] font-semibold text-white">
                    {member.initials}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 pt-0.5">
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-900">
                      {member.initials === "JD"
                        ? "John"
                        : member.initials === "AS"
                          ? "Alice"
                          : member.initials === "MK"
                            ? "Mike"
                            : "Sara"}
                    </span>{" "}
                    {activity.action}
                  </p>

                  {/* Comment Bubble */}
                  {activity.comment && (
                    <div
                      className={cn(
                        "mt-2 flex items-start rounded-xl",
                        "bg-gradient-to-r from-slate-50 to-slate-100/50",
                        "border border-slate-100",
                        "px-3 py-2 shadow-sm",
                        "transition-all delay-500 duration-300",
                        isInView
                          ? "scale-100 opacity-100"
                          : "scale-95 opacity-0"
                      )}
                    >
                      <MessageSquare className="mt-0.5 mr-2 h-3 w-3 shrink-0 text-slate-400" />
                      <span className="text-xs text-slate-600">
                        {activity.comment}
                      </span>
                    </div>
                  )}

                  <p className="mt-1 text-[10px] text-slate-400">
                    {activity.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
