"use client";

import { ChevronUp } from "lucide-react";

interface IdeaVoteBoxProps {
  voteCount: number;
}

export function IdeaVoteBox({ voteCount }: IdeaVoteBoxProps) {
  return (
    <div className="flex h-20 w-16 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white transition-all hover:border-blue-300 hover:shadow-md">
      <ChevronUp className="h-5 w-5 text-slate-400" />
      <span className="text-2xl font-bold text-slate-900">{voteCount}</span>
      <span className="text-xs text-slate-500">Votes</span>
    </div>
  );
}
