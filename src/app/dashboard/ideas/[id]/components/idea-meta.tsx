"use client";

interface IdeaMetaProps {
  createdAt: Date;
  authorEmail?: string | null;
}

export function IdeaMeta({ createdAt, authorEmail }: IdeaMetaProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="font-mono text-xs tabular-nums">{formattedDate}</span>

      {authorEmail && (
        <>
          <span className="text-border">|</span>
          <span className="truncate">{authorEmail}</span>
        </>
      )}
    </div>
  );
}
