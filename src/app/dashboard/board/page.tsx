import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, count } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
      <div className="space-y-6 px-4 py-12 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Board
          </h1>
          <p className="mt-1 text-slate-500">
            Configure your public feedback board.
          </p>
        </div>

        {workspace ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">Branding</CardTitle>
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

            <Card className="rounded-xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">
                  Public Board URL
                </CardTitle>
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
          </div>
        ) : (
          <Card className="rounded-xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">No Workspace Yet</CardTitle>
              <CardDescription>
                Create your first idea to set up your workspace and get your
                board URL and embed code.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
