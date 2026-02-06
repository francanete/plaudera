import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, count } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WorkspaceSlugForm } from "@/components/settings/workspace-slug-form";
import { WorkspaceBrandingForm } from "@/components/settings/workspace-branding-form";
import { getUserWorkspace } from "@/lib/workspace";
import { db, slugChangeHistory, boardSettings } from "@/lib/db";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { RoadmapSettingsSection } from "@/components/settings/roadmap-settings-section";

export default async function BoardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const workspace = await getUserWorkspace(session!.user.id);

  let slugChangesUsed = 0;
  let roadmapDefaultListView = false;

  if (workspace) {
    const [slugCountResults, boardSettingsRow] = await Promise.all([
      db
        .select({ count: count() })
        .from(slugChangeHistory)
        .where(eq(slugChangeHistory.workspaceId, workspace.id)),
      db.query.boardSettings.findFirst({
        where: eq(boardSettings.workspaceId, workspace.id),
        columns: { roadmapDefaultListView: true },
      }),
    ]);

    slugChangesUsed = slugCountResults[0]?.count ?? 0;
    roadmapDefaultListView = boardSettingsRow?.roadmapDefaultListView ?? false;
  }

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Board"
        subtitle="Configure your public feedback board."
      />

      {workspace ? (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Customize how your workspace appears on the public board and
                widget.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkspaceBrandingForm
                currentName={workspace.name}
                currentDescription={workspace.description}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Public Board URL</CardTitle>
              <CardDescription>
                Customize the slug for your public feedback board.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkspaceSlugForm
                currentSlug={workspace.slug}
                changesUsed={slugChangesUsed}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roadmap Settings</CardTitle>
              <CardDescription>
                Configure how the public roadmap is displayed to visitors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoadmapSettingsSection
                initialRoadmapDefaultListView={roadmapDefaultListView}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Workspace Yet</CardTitle>
            <CardDescription>
              Create your first idea to set up your workspace and get your board
              URL and embed code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Go to the Ideas page and create an idea to automatically generate
              your workspace.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
