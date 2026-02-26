import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserWorkspace } from "@/lib/workspace";
import { listWorkspacePolls } from "@/lib/poll-queries";
import { MessageCircleQuestion, Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Badge } from "@/components/ui/badge";

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  active: "default",
  draft: "secondary",
  closed: "outline",
};

export default async function PollsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const workspace = await getUserWorkspace(session.user.id);
  if (!workspace) redirect("/dashboard");

  const polls = await listWorkspacePolls(workspace.id);

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Polls"
        subtitle="Ask quick questions and collect short feedback from your users."
        icon={MessageCircleQuestion}
        iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        action={{
          label: "Create poll",
          href: "/dashboard/polls/create",
          icon: Plus,
        }}
      />

      {polls.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center">
          <MessageCircleQuestion className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">No polls yet</p>
          <p className="mt-1 text-xs">
            Create your first poll to start collecting quick feedback.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <Link
              key={poll.id}
              href={`/dashboard/polls/${poll.id}`}
              className="bg-card hover:bg-accent/50 block rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{poll.question}</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {poll.responseCount}{" "}
                    {poll.responseCount === 1 ? "response" : "responses"} ·{" "}
                    {new Date(poll.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={STATUS_BADGE_VARIANT[poll.status] ?? "outline"}>
                  {poll.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
