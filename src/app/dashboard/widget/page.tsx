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
    <div className="min-h-screen bg-slate-50/50">
      <div className="space-y-4 px-0 py-4 sm:space-y-6 sm:px-2 sm:py-8 lg:px-6 lg:py-10">
        <div className="px-1 sm:px-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Widget
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Configure your embeddable feedback widget.
          </p>
        </div>

        {workspace ? (
          <WidgetSection
            workspaceId={workspace.id}
            workspaceSlug={workspace.slug}
            initialPosition={initialPosition}
            initialAllowedOrigins={initialAllowedOrigins}
            initialPageRules={initialPageRules}
            initialShowLabel={initialShowLabel}
          />
        ) : (
          <Card className="rounded-xl border-slate-200 shadow-sm">
            <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
              <CardTitle className="text-base text-slate-900 sm:text-lg">
                No Workspace Yet
              </CardTitle>
              <CardDescription className="text-sm">
                Create your first idea to set up your workspace and configure
                your embed widget.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <p className="text-sm text-slate-500">
                Go to the Ideas page and create an idea to automatically
                generate your workspace.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
