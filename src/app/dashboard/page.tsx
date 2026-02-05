import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, ideas } from "@/lib/db";
import { eq, sql, desc } from "drizzle-orm";
import { Lightbulb, ChevronUp, Calendar, AlertCircle } from "lucide-react";
import { getUserWorkspace } from "@/lib/workspace";
import { PublicBoardCard } from "@/components/dashboard/public-board-card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { appConfig } from "@/lib/config";
import type { IdeaStatus } from "@/lib/db/schema";

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
  let topIdeas: {
    id: string;
    title: string;
    voteCount: number;
    status: IdeaStatus;
  }[] = [];

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

    // Fetch top 5 voted ideas
    topIdeas = await db
      .select({
        id: ideas.id,
        title: ideas.title,
        voteCount: ideas.voteCount,
        status: ideas.status,
      })
      .from(ideas)
      .where(eq(ideas.workspaceId, workspace.id))
      .orderBy(desc(ideas.voteCount))
      .limit(5);
  }

  const stats = [
    {
      label: "Total Ideas",
      value: totalIdeas,
      subtext: "Feature requests",
      icon: Lightbulb,
      tourId: "stat-ideas",
    },
    {
      label: "Total Votes",
      value: totalVotes,
      subtext: "Community engagement",
      icon: ChevronUp,
      tourId: "stat-votes",
    },
    {
      label: "This Week",
      value: weeklyIdeas,
      subtext: "New ideas",
      icon: Calendar,
      tourId: "stat-weekly",
    },
    {
      label: "Pending Review",
      value: pendingIdeas,
      subtext: pendingIdeas > 0 ? "Click to review" : "All caught up!",
      icon: AlertCircle,
      tourId: "stat-pending",
      href: pendingIdeas > 0 ? "/dashboard/ideas?status=UNDER_REVIEW" : null,
      variant: pendingIdeas > 0 ? ("warning" as const) : ("default" as const),
    },
  ];

  const boardUrl = workspace
    ? `${appConfig.seo.siteUrl}/b/${workspace.slug}`
    : null;

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title={`Welcome back, ${session!.user.name || "there"}!`}
        subtitle="Here's what's happening with your account."
      />

      {/* Public Board URL */}
      {boardUrl && <PublicBoardCard boardUrl={boardUrl} />}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            subtext={stat.subtext}
            icon={stat.icon}
            tourId={stat.tourId}
            href={stat.href}
            variant={stat.variant}
          />
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <QuickActions />
        <RecentActivity topIdeas={topIdeas} />
      </div>
    </div>
  );
}
