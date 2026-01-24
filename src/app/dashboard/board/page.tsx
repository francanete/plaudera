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
import { WidgetSection } from "@/components/settings/widget-section";
import { WorkspaceSlugForm } from "@/components/settings/workspace-slug-form";
import { getUserWorkspace } from "@/lib/workspace";
import { db, widgetSettings, slugChangeHistory } from "@/lib/db";
import type { WidgetPosition } from "@/lib/db/schema";

export default async function BoardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const workspace = await getUserWorkspace(session!.user.id);

  let initialPosition: WidgetPosition = "bottom-right";
  let initialAllowedOrigins: string[] = [];
  let slugChangesUsed = 0;

  if (workspace) {
    const [settings, [slugCountResult]] = await Promise.all([
      db.query.widgetSettings.findFirst({
        where: eq(widgetSettings.workspaceId, workspace.id),
      }),
      db
        .select({ count: count() })
        .from(slugChangeHistory)
        .where(eq(slugChangeHistory.workspaceId, workspace.id)),
    ]);

    initialPosition = settings?.position ?? "bottom-right";
    initialAllowedOrigins = settings?.allowedOrigins ?? [];
    slugChangesUsed = slugCountResult?.count ?? 0;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Board</h1>
        <p className="text-muted-foreground mt-1">
          Configure your public feedback board and embed widget.
        </p>
      </div>

      {workspace ? (
        <>
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

          <WidgetSection
            workspaceSlug={workspace.slug}
            initialPosition={initialPosition}
            initialAllowedOrigins={initialAllowedOrigins}
          />
        </>
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
