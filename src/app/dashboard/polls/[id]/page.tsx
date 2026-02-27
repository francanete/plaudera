import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getUserWorkspace } from "@/lib/workspace";
import { getPollById, getPollResponses } from "@/lib/poll-queries";
import { MessageCircleQuestion } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Badge } from "@/components/ui/badge";
import { PollActions } from "./components/poll-actions";
import { PollResponseList } from "./components/poll-response-list";

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  active: "default",
  draft: "secondary",
  closed: "outline",
};

export default async function PollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const workspace = await getUserWorkspace(session.user.id);
  if (!workspace) redirect("/dashboard");

  const { id } = await params;
  const poll = await getPollById(id, workspace.id);
  if (!poll) notFound();

  const responses = await getPollResponses(id);

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title={poll.question}
        icon={MessageCircleQuestion}
        iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        backHref="/dashboard/polls"
        backLabel="Back to polls"
        action={
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_BADGE_VARIANT[poll.status] ?? "outline"}>
              {poll.status}
            </Badge>
            <span className="text-muted-foreground text-sm">
              {poll.responseCount}{" "}
              {poll.responseCount === 1 ? "response" : "responses"}
            </span>
            <PollActions pollId={poll.id} status={poll.status} />
          </div>
        }
      />

      <PollResponseList responses={responses} pollId={poll.id} />
    </div>
  );
}
