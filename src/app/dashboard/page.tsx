import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, subscriptions, ideas } from "@/lib/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, ChevronUp, Calendar, CreditCard, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getUserWorkspace } from "@/lib/workspace";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session!.user.id))
    .limit(1);

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

    // Get total ideas and votes
    const [totals] = await db
      .select({
        totalIdeas: sql<number>`COUNT(*)::int`,
        totalVotes: sql<number>`COALESCE(SUM(${ideas.voteCount}), 0)::int`,
      })
      .from(ideas)
      .where(eq(ideas.workspaceId, workspace.id));

    // Get ideas created this week
    const [weekly] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(ideas)
      .where(
        and(
          eq(ideas.workspaceId, workspace.id),
          gte(ideas.createdAt, oneWeekAgo)
        )
      );

    // Get pending ideas count (awaiting admin approval)
    const [pending] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(ideas)
      .where(
        and(
          eq(ideas.workspaceId, workspace.id),
          eq(ideas.status, "PENDING")
        )
      );

    totalIdeas = totals?.totalIdeas ?? 0;
    totalVotes = totals?.totalVotes ?? 0;
    weeklyIdeas = weekly?.count ?? 0;
    pendingIdeas = pending?.count ?? 0;
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
      title: "Plan",
      value: subscription?.plan || "FREE",
      description:
        subscription?.status === "TRIALING" ? "Trial active" : "Current plan",
      icon: CreditCard,
      tourId: "stat-plan",
    },
  ];

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

      {/* Pending Ideas Alert */}
      {pendingIdeas > 0 && (
        <Link href="/dashboard/ideas?status=PENDING">
          <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 hover:border-orange-500 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-full bg-orange-500/20 p-3">
                <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                  {pendingIdeas} idea{pendingIdeas > 1 ? "s" : ""} awaiting review
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Click to review and approve new submissions
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} id={`tour-${stat.tourId}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-muted-foreground text-xs">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
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
