import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WidgetSection } from "@/components/settings/widget-section";
import { getUserWorkspace } from "@/lib/workspace";
import { db, widgetSettings } from "@/lib/db";
import type { WidgetPosition } from "@/lib/db/schema";

export default async function WidgetPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const workspace = await getUserWorkspace(session!.user.id);

  // Fetch widget settings if workspace exists
  let initialPosition: WidgetPosition = "bottom-right";
  if (workspace) {
    const settings = await db.query.widgetSettings.findFirst({
      where: eq(widgetSettings.workspaceId, workspace.id),
    });
    initialPosition = settings?.position ?? "bottom-right";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Embed Widget</h1>
        <p className="text-muted-foreground mt-1">
          Add a feedback widget to your website and let customers submit ideas
          without leaving your site.
        </p>
      </div>

      {workspace ? (
        <WidgetSection
          workspaceSlug={workspace.slug}
          initialPosition={initialPosition}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Workspace Yet</CardTitle>
            <CardDescription>
              Create your first idea to set up your workspace and get your embed
              code.
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
