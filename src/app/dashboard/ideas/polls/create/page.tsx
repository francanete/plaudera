import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { CreatePollForm } from "./create-poll-form";

export default async function CreatePollPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Create Poll"
        subtitle="Choose a template or write your own question."
        icon={MessageCircleQuestion}
        iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        backHref="/dashboard/ideas/polls"
        backLabel="Back to polls"
      />

      <CreatePollForm />
    </div>
  );
}
