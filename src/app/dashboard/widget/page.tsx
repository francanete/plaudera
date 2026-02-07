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
import { Button } from "@/components/ui/button";
import { WidgetSection } from "@/components/settings/widget-section";
import { getUserWorkspace } from "@/lib/workspace";
import { db, widgetSettings } from "@/lib/db";
import type { WidgetPosition } from "@/lib/db/schema";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export default async function WidgetPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const workspace = await getUserWorkspace(session!.user.id);

  let initialPosition: WidgetPosition = "bottom-right";
  let initialAllowedOrigins: string[] = [];
  let initialPageRules: string[] = [];
  let initialShowLabel = true;

  if (workspace) {
    const settings = await db.query.widgetSettings.findFirst({
      where: eq(widgetSettings.workspaceId, workspace.id),
    });

    initialPosition = settings?.position ?? "bottom-right";
    initialAllowedOrigins = settings?.allowedOrigins ?? [];
    initialPageRules = settings?.pageRules ?? [];
    initialShowLabel = settings?.showLabel ?? true;
  }

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Widget"
        subtitle="Configure your embeddable feedback widget."
        action={
          <Button
            asChild
            className="bg-foreground text-background hover:bg-foreground/90 gap-2"
          >
            <Link href="/preview" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Preview Widget
            </Link>
          </Button>
        }
      />

      {workspace ? (
        <WidgetSection
          workspaceId={workspace.id}
          initialPosition={initialPosition}
          initialAllowedOrigins={initialAllowedOrigins}
          initialPageRules={initialPageRules}
          initialShowLabel={initialShowLabel}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Workspace Yet</CardTitle>
            <CardDescription>
              Create your first idea to set up your workspace and configure your
              embed widget.
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
