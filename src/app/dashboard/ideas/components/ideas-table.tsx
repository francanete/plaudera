"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { Idea } from "@/lib/db/schema";
import type { ConfidenceResult } from "@/lib/confidence";
import { ConfidenceBadge } from "./confidence-badge";

type IdeaWithConfidence = Idea & {
  confidence?: ConfidenceResult;
  strategicTags?: { tag: { id: string; name: string; color: string } }[];
};

type SortColumn =
  | "title"
  | "confidence"
  | "votes"
  | "frequency"
  | "impact"
  | "tags";
type SortDir = "asc" | "desc";

const LABEL_TIER: Record<string, number> = {
  strong: 2,
  emerging: 1,
  anecdotal: 0,
};

interface IdeasTableProps {
  ideas: IdeaWithConfidence[];
}

export function IdeasTable({ ideas }: IdeasTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("votes");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    return [...ideas].sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "confidence": {
          const tierA = a.confidence
            ? (LABEL_TIER[a.confidence.label] ?? -1)
            : -1;
          const tierB = b.confidence
            ? (LABEL_TIER[b.confidence.label] ?? -1)
            : -1;
          cmp = tierA - tierB;
          if (cmp === 0) {
            cmp =
              (a.confidence?.intraScore ?? -1) -
              (b.confidence?.intraScore ?? -1);
          }
          break;
        }
        case "votes":
          cmp = a.voteCount - b.voteCount;
          break;
        case "frequency":
          cmp = (a.frequencyTag ?? "").localeCompare(b.frequencyTag ?? "");
          break;
        case "impact":
          cmp = (a.workflowImpact ?? "").localeCompare(b.workflowImpact ?? "");
          break;
        case "tags":
          cmp = (a.strategicTags?.length ?? 0) - (b.strategicTags?.length ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [ideas, sortColumn, sortDir]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("title")}
            >
              Title <SortIcon column="title" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("confidence")}
            >
              Confidence <SortIcon column="confidence" />
            </TableHead>
            <TableHead
              className="w-20 cursor-pointer text-right select-none"
              onClick={() => handleSort("votes")}
            >
              Votes <SortIcon column="votes" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("frequency")}
            >
              Frequency <SortIcon column="frequency" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("impact")}
            >
              Impact <SortIcon column="impact" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("tags")}
            >
              Tags <SortIcon column="tags" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((idea) => (
            <TableRow key={idea.id}>
              <TableCell className="max-w-xs">
                <Link
                  href={`/dashboard/ideas/${idea.id}`}
                  className="text-foreground truncate font-medium hover:underline"
                >
                  {idea.title}
                </Link>
              </TableCell>
              <TableCell>
                {idea.confidence ? (
                  <ConfidenceBadge
                    label={idea.confidence.label}
                    intraScore={idea.confidence.intraScore}
                    size="sm"
                  />
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {idea.voteCount}
              </TableCell>
              <TableCell>
                {idea.frequencyTag ? (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs capitalize dark:bg-slate-800">
                    {idea.frequencyTag}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
              <TableCell>
                {idea.workflowImpact ? (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs capitalize dark:bg-slate-800">
                    {idea.workflowImpact.replace("_", " ")}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {idea.strategicTags?.map((st) => (
                    <span
                      key={st.tag.id}
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: st.tag.color }}
                      title={st.tag.name}
                    />
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
