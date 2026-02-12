import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { appConfig } from "@/lib/config";
import { getContributor } from "@/lib/contributor-auth";
import { getWorkspaceBySlug } from "@/lib/workspace";
import { BoardLayoutClient } from "./board-layout-client";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: {
    template: `%s | ${appConfig.name} Feedback`,
    default: `Feedback Board | ${appConfig.name}`,
  },
  description: "Share your ideas and vote on feature requests",
};

export default async function BoardLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);

  if (!workspace) {
    notFound();
  }

  const contributor = await getContributor();
  const headersList = await headers();
  const isSubdomain = headersList.get("x-is-subdomain") === "true";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <main className="w-full flex-1 px-4 pb-8 sm:px-6">
        <BoardLayoutClient
          slug={slug}
          workspaceName={workspace.name}
          workspaceDescription={workspace.description}
          workspaceId={workspace.id}
          isSubdomain={isSubdomain}
          initialContributor={
            contributor
              ? { email: contributor.email, id: contributor.id }
              : null
          }
        >
          {children}
        </BoardLayoutClient>
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="container mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Powered by{" "}
            <a
              href={process.env.NEXT_PUBLIC_APP_URL || "/"}
              className="font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              {appConfig.name}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
