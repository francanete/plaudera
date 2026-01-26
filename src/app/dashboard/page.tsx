import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, ideas } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, ChevronUp, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getUserWorkspace } from "@/lib/workspace";
import { PublicBoardCard } from "@/components/dashboard/public-board-card";
import { appConfig } from "@/lib/config";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Get user's workspace for analytics
  const workspace = await getUserWorkspace(session!.user.id);

  // Calculate analytics if workspace exists
  let totalIdeas = 0;
  let totalVotes = 0;
  let weeklyIdeas = 0;
  let pendingIdeas = 0;

  if (workspace) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Single query with FILTER clauses for all analytics
    const [analytics] = await db
      .select({
        totalIdeas: sql<number>`COUNT(*)::int`,
        totalVotes: sql<number>`COALESCE(SUM(${ideas.voteCount}), 0)::int`,
        weeklyIdeas: sql<number>`COUNT(*) FILTER (WHERE ${ideas.createdAt} >= ${oneWeekAgo})::int`,
        pendingIdeas: sql<number>`COUNT(*) FILTER (WHERE ${ideas.status} = 'UNDER_REVIEW')::int`,
      })
      .from(ideas)
      .where(eq(ideas.workspaceId, workspace.id));

    totalIdeas = analytics?.totalIdeas ?? 0;
    totalVotes = analytics?.totalVotes ?? 0;
    weeklyIdeas = analytics?.weeklyIdeas ?? 0;
    pendingIdeas = analytics?.pendingIdeas ?? 0;
  }

  const stats = [
    {
      title: "Total Ideas",
      value: totalIdeas.toString(),
      description: "Feature requests",
      icon: Lightbulb,
      tourId: "stat-ideas",
    },
    {
      title: "Total Votes",
      value: totalVotes.toString(),
      description: "Community engagement",
      icon: ChevronUp,
      tourId: "stat-votes",
    },
    {
      title: "This Week",
      value: weeklyIdeas.toString(),
      description: "New ideas",
      icon: Calendar,
      tourId: "stat-weekly",
    },
    {
      title: "Pending Review",
      value: pendingIdeas.toString(),
      description: pendingIdeas > 0 ? "Click to review" : "All caught up!",
      icon: AlertCircle,
      tourId: "stat-pending",
      href: pendingIdeas > 0 ? "/dashboard/ideas?status=UNDER_REVIEW" : null,
      highlight: pendingIdeas > 0,
    },
  ];

  const boardUrl = workspace
    ? `${appConfig.seo.siteUrl}/b/${workspace.slug}`
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {session!.user.name || "there"}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your account.
        </p>
      </div>

      {/* Public Board URL */}
      {boardUrl && <PublicBoardCard boardUrl={boardUrl} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const cardContent = (
            <>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle
                  className={`text-sm font-medium ${stat.highlight ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}
                >
                  {stat.title}
                </CardTitle>
                <stat.icon
                  className={`h-4 w-4 ${stat.highlight ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${stat.highlight ? "text-orange-600 dark:text-orange-400" : ""}`}
                >
                  {stat.value}
                </div>
                <p
                  className={`text-xs ${stat.highlight ? "text-orange-600/80 dark:text-orange-400/80" : "text-muted-foreground"}`}
                >
                  {stat.description}
                </p>
              </CardContent>
            </>
          );

          if (stat.href) {
            return (
              <Link key={stat.title} href={stat.href}>
                <Card
                  id={`tour-${stat.tourId}`}
                  className="cursor-pointer border-orange-500/50 bg-orange-50 transition-colors hover:border-orange-500 dark:bg-orange-950/20"
                >
                  {cardContent}
                </Card>
              </Link>
            );
          }

          return (
            <Card key={stat.title} id={`tour-${stat.tourId}`}>
              {cardContent}
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card id="tour-quick-actions">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Start a new AI conversation, create a project, or manage your
              settings.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              No recent activity to show.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
