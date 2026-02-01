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
import { db, slugChangeHistory } from "@/lib/db";

export default async function BoardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const workspace = await getUserWorkspace(session!.user.id);

  let slugChangesUsed = 0;

  if (workspace) {
    const [slugCountResult] = await db
      .select({ count: count() })
      .from(slugChangeHistory)
      .where(eq(slugChangeHistory.workspaceId, workspace.id));

    slugChangesUsed = slugCountResult?.count ?? 0;
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="space-y-4 px-0 py-4 sm:space-y-6 sm:px-2 sm:py-8 lg:px-6 lg:py-10">
        <div className="px-1 sm:px-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Board
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Configure your public feedback board.
          </p>
        </div>

        {workspace ? (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
                <CardTitle className="text-base text-slate-900 sm:text-lg">
                  Branding
                </CardTitle>
                <CardDescription className="text-sm">
                  Customize how your workspace appears on the public board and
                  widget.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                <WorkspaceBrandingForm
                  currentName={workspace.name}
                  currentDescription={workspace.description}
                />
              </CardContent>
            </Card>

            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
                <CardTitle className="text-base text-slate-900 sm:text-lg">
                  Public Board URL
                </CardTitle>
                <CardDescription className="text-sm">
                  Customize the slug for your public feedback board.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                <WorkspaceSlugForm
                  currentSlug={workspace.slug}
                  changesUsed={slugChangesUsed}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="rounded-xl border-slate-200 shadow-sm">
            <CardHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
              <CardTitle className="text-base text-slate-900 sm:text-lg">
                No Workspace Yet
              </CardTitle>
              <CardDescription className="text-sm">
                Create your first idea to set up your workspace and get your
                board URL and embed code.
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
