"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type TestimonialDefinition } from "@/lib/testimonials-config";

interface TestimonialCardProps {
  testimonial: TestimonialDefinition;
  isInView: boolean;
  delay?: number;
}

export function TestimonialCard({
  testimonial,
  isInView,
  delay = 0,
}: TestimonialCardProps) {
  const { author, role, company, quote, initials, featured, stats } =
    testimonial;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl p-8 transition-all duration-500",
        featured
          ? "bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl lg:col-span-2"
          : "border border-slate-200/60 bg-white/80 shadow-sm hover:-translate-y-1 hover:shadow-lg",
        isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      )}
      style={{ transitionDelay: isInView ? `${delay}ms` : "0ms" }}
    >
      {/* Quote Icon */}
      <div className="relative z-10 mb-6">
        <QuoteIcon
          className={cn(
            "h-6 w-6",
            featured ? "text-indigo-400" : "text-slate-300"
          )}
        />
      </div>

      {/* Quote Content */}
      <blockquote className="relative z-10 mb-8 flex-grow">
        <p
          className={cn(
            "leading-relaxed font-medium tracking-tight",
            featured
              ? "text-xl text-slate-100 md:text-2xl"
              : "text-lg text-slate-700"
          )}
        >
          &ldquo;{quote}&rdquo;
        </p>
      </blockquote>

      {/* Stats Badge */}
      {stats && (
        <div
          className={cn(
            "absolute top-8 right-8 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
            featured
              ? "border border-indigo-500/30 bg-indigo-500/20 text-indigo-200"
              : "border border-indigo-100 bg-indigo-50 text-indigo-600"
          )}
        >
          {stats}
        </div>
      )}

      {/* Author Info */}
      <div className="relative z-10 mt-auto flex items-center border-t border-slate-100/10 pt-6">
        {/* Avatar */}
        <div
          className={cn(
            "mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-inner",
            featured
              ? "bg-gradient-to-br from-indigo-400 to-purple-500 text-white ring-2 ring-white/10"
              : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 ring-1 ring-slate-200"
          )}
        >
          {initials}
        </div>

        <div>
          <div
            className={cn(
              "flex items-center gap-2 font-bold",
              featured ? "text-white" : "text-slate-900"
            )}
          >
            {author}
            <VerifiedIcon
              className={cn(
                "h-4 w-4",
                featured ? "text-blue-400" : "text-blue-500"
              )}
            />
          </div>
          <div
            className={cn(
              "text-sm",
              featured ? "text-slate-400" : "text-slate-500"
            )}
          >
            {role},{" "}
            <span
              className={cn(
                "font-medium",
                featured ? "text-indigo-300" : "text-indigo-600"
              )}
            >
              {company}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 11H6C5.46957 11 4.96086 11.2107 4.58579 11.5858C4.21071 11.9609 4 12.4696 4 13V19C4 19.5304 4.21071 20.0391 4.58579 20.4142C4.96086 20.7893 5.46957 21 6 21H10V11ZM10 11V7C10 5.34315 11.3431 4 13 4M20 11H16C15.4696 11 14.9609 11.2107 14.5858 11.5858C14.2107 11.9609 14 12.4696 14 13V19C14 19.5304 14.2107 20.0391 14.5858 20.4142C14.9609 20.7893 15.4696 21 16 21H20V11ZM20 11V7C20 5.34315 21.3431 4 23 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VerifiedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
